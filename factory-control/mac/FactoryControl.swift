import AppKit
import SwiftUI

private struct FactoryRun: Identifiable {
    let id: String
    let issueId: String
    let title: String
    let status: String
    let message: String?
}

private struct FactoryProject: Identifiable {
    let id: String
    let name: String
    let path: String
    let goal: String
    let logsPath: String?
    let enabled: Bool
    let planning: Bool
    let message: String?
    let runs: [FactoryRun]
}

@MainActor
private final class FactoryController: ObservableObject {
    @Published private(set) var projects: [FactoryProject] = []
    @Published private(set) var errorMessage: String?
    @Published private(set) var connected = false
    @Published private(set) var pendingProjectIds: Set<String> = []
    @Published private(set) var shuttingDown = false

    private var process: Process?
    private var inputPipe: Pipe?
    private var outputPipe: Pipe?
    private var nextCommandNumber = 1
    private var pendingMethods: [String: String] = [:]
    private var pendingProjectByCommand: [String: String] = [:]
    private var incompleteOutput = Data()
    private var quitCompletion: (() -> Void)?

    var isWorking: Bool {
        projects.contains { project in
            project.planning || project.runs.contains { run in
                ["queued", "launching", "planning", "working", "running"].contains(run.status.lowercased())
            }
        }
    }

    func showError(_ message: String) {
        errorMessage = message
    }

    func start() {
        guard process == nil else {
            return
        }

        guard let appExecutable = Bundle.main.executableURL,
              let bridgePath = Bundle.main.resourceURL?.appendingPathComponent("backend/bridge.mjs"),
              let nodePath = Self.findNode() else {
            errorMessage = "The factory backend or Node.js could not be located."
            return
        }

        let helperPath = appExecutable.deletingLastPathComponent().appendingPathComponent("Factory Backend")
        let stateDirectory = FileManager.default.homeDirectoryForCurrentUser
            .appendingPathComponent("Library/Application Support/Factory Control", isDirectory: true)
        let lockPath = stateDirectory.appendingPathComponent("dispatcher.lock").path

        do {
            try FileManager.default.createDirectory(at: stateDirectory, withIntermediateDirectories: true)
        } catch {
            errorMessage = "Could not prepare factory state storage: \(error.localizedDescription)"
            return
        }

        guard FileManager.default.isExecutableFile(atPath: helperPath.path),
              FileManager.default.fileExists(atPath: bridgePath.path) else {
            errorMessage = "The bundled factory backend helper or bridge was not found."
            return
        }

        let childProcess = Process()
        let childInput = Pipe()
        let childOutput = Pipe()
        let childError = Pipe()
        childProcess.executableURL = helperPath
        childProcess.arguments = [lockPath, nodePath, bridgePath.path]
        childProcess.standardInput = childInput
        childProcess.standardOutput = childOutput
        childProcess.standardError = childError

        childOutput.fileHandleForReading.readabilityHandler = { [weak self] handle in
            let receivedData = handle.availableData
            guard !receivedData.isEmpty else {
                return
            }
            Task { @MainActor [weak self] in
                self?.receiveOutput(receivedData)
            }
        }

        childError.fileHandleForReading.readabilityHandler = { handle in
            let receivedData = handle.availableData
            guard !receivedData.isEmpty,
                  let logLine = String(data: receivedData, encoding: .utf8) else {
                return
            }
            NSLog("Factory backend: %@", logLine.trimmingCharacters(in: .newlines))
        }

        childProcess.terminationHandler = { [weak self] finishedProcess in
            Task { @MainActor [weak self] in
                self?.backendStopped(exitCode: finishedProcess.terminationStatus)
            }
        }

        do {
            try childProcess.run()
            process = childProcess
            inputPipe = childInput
            outputPipe = childOutput
            connected = true
            errorMessage = nil
            send(method: "status")
        } catch {
            errorMessage = "Could not start the factory backend: \(error.localizedDescription)"
        }
    }

    func addProject(path: String, goal: String) {
        send(method: "add", fields: ["path": path, "goal": goal])
    }

    func setEnabled(_ enabled: Bool, for project: FactoryProject) {
        guard !pendingProjectIds.contains(project.id) else {
            return
        }
        pendingProjectIds.insert(project.id)
        send(method: "toggle", projectId: project.id, fields: ["enabled": enabled])
    }

    func removeProject(_ project: FactoryProject) {
        guard !pendingProjectIds.contains(project.id) else {
            return
        }
        pendingProjectIds.insert(project.id)
        send(method: "remove", projectId: project.id)
    }

    func requestQuit(completion: @escaping () -> Void) {
        guard !shuttingDown else {
            return
        }
        shuttingDown = true
        quitCompletion = completion
        guard connected else {
            completion()
            return
        }
        send(method: "shutdown")
    }

    func openLogs(for project: FactoryProject) {
        guard let logsPath = project.logsPath else {
            errorMessage = "The backend has not provided a logs folder for \(project.name)."
            return
        }
        let logsFolder = URL(fileURLWithPath: logsPath, isDirectory: true)
        guard FileManager.default.fileExists(atPath: logsFolder.path) else {
            errorMessage = "No logs folder exists yet for \(project.name)."
            return
        }
        NSWorkspace.shared.selectFile(nil, inFileViewerRootedAtPath: logsFolder.path)
    }

    private func send(method: String, projectId: String? = nil, fields: [String: Any] = [:]) {
        guard connected, let inputPipe, !shuttingDown || method == "shutdown" else {
            errorMessage = "The factory backend is unavailable. No change was sent."
            return
        }

        let commandId = "mac-\(nextCommandNumber)"
        nextCommandNumber += 1
        pendingMethods[commandId] = method
        pendingProjectByCommand[commandId] = projectId

        var command: [String: Any] = ["id": commandId, "method": method]
        if let projectId {
            command["projectId"] = projectId
        }
        for (fieldName, value) in fields {
            command[fieldName] = value
        }

        do {
            var commandData = try JSONSerialization.data(withJSONObject: command)
            commandData.append(0x0A)
            try inputPipe.fileHandleForWriting.write(contentsOf: commandData)
        } catch {
            pendingMethods.removeValue(forKey: commandId)
            pendingProjectByCommand.removeValue(forKey: commandId)
            if let projectId {
                pendingProjectIds.remove(projectId)
            }
            errorMessage = "Could not send the request: \(error.localizedDescription)"
        }
    }

    private func receiveOutput(_ receivedData: Data) {
        incompleteOutput.append(receivedData)

        while let lineEnding = incompleteOutput.firstIndex(of: 0x0A) {
            let responseData = incompleteOutput.prefix(upTo: lineEnding)
            incompleteOutput.removeSubrange(...lineEnding)
            handle(responseData: Data(responseData))
        }
    }

    private func handle(responseData: Data) {
        guard let responseObject = try? JSONSerialization.jsonObject(with: responseData),
              let response = responseObject as? [String: Any] else {
            errorMessage = "The backend sent a response the app could not read."
            return
        }

        if let commandId = response["id"] as? String,
           let method = pendingMethods.removeValue(forKey: commandId) {
            let projectId = pendingProjectByCommand.removeValue(forKey: commandId)
            if method == "shutdown" {
                try? inputPipe?.fileHandleForWriting.close()
                quitCompletion?()
                quitCompletion = nil
            } else {
                if let projectId = projectId ?? response["projectId"] as? String {
                    pendingProjectIds.remove(projectId)
                }
                if let failureText = response["error"] as? String {
                    errorMessage = "\(method.capitalized) failed: \(failureText)"
                }
            }
        }

        if let failureText = response["error"] as? String,
           response["type"] as? String != "state" {
            errorMessage = failureText
        }

        guard response["type"] as? String == "state",
              let projectValues = response["projects"] as? [[String: Any]] else {
            return
        }

        projects = projectValues.compactMap(Self.project(from:))
        errorMessage = response["error"] as? String
    }

    private func backendStopped(exitCode: Int32) {
        connected = false
        process = nil
        inputPipe = nil
        outputPipe = nil
        pendingMethods.removeAll()
        pendingProjectIds.removeAll()
        errorMessage = errorMessage ?? "The factory backend stopped (exit \(exitCode)). The app will not report changes as successful."
        if shuttingDown {
            quitCompletion?()
            quitCompletion = nil
        }
    }

    private static func project(from value: [String: Any]) -> FactoryProject? {
        guard let id = value["id"] as? String,
              let name = value["name"] as? String,
              let path = value["path"] as? String else {
            return nil
        }

        let runs = (value["runs"] as? [[String: Any]] ?? []).compactMap { runValue -> FactoryRun? in
            guard let runId = runValue["id"] as? String,
                  let title = runValue["title"] as? String,
                  let status = runValue["status"] as? String else {
                return nil
            }
            return FactoryRun(
                id: runId,
                issueId: runValue["issueId"] as? String ?? "",
                title: title,
                status: status,
                message: runValue["message"] as? String
            )
        }

        return FactoryProject(
            id: id,
            name: name,
            path: path,
            goal: value["goal"] as? String ?? "",
            logsPath: value["logsPath"] as? String,
            enabled: value["enabled"] as? Bool ?? false,
            planning: value["planning"] as? Bool ?? false,
            message: value["message"] as? String,
            runs: runs
        )
    }

    private static func findNode() -> String? {
        let candidates = ["/opt/homebrew/bin/node", "/usr/local/bin/node", "/usr/bin/node"]
        return candidates.first { FileManager.default.isExecutableFile(atPath: $0) }
    }

}

@MainActor
private final class FactoryAppDelegate: NSObject, NSApplicationDelegate {
    private let statusItem = NSStatusBar.system.statusItem(withLength: NSStatusItem.variableLength)
    private let controller = FactoryController()
    private let popover = NSPopover()

    func applicationDidFinishLaunching(_ notification: Notification) {
        NSApp.setActivationPolicy(.accessory)

        if let button = statusItem.button {
            button.image = NSImage(systemSymbolName: "square.stack.3d.up.fill", accessibilityDescription: "Factory")
            button.imagePosition = .imageLeading
            button.toolTip = "Factory Control"
            button.setAccessibilityLabel("Factory")
        }

        popover.behavior = .transient
        popover.contentSize = NSSize(width: 380, height: 510)
        popover.contentViewController = NSHostingController(rootView: FactoryPopover(controller: controller))
        statusItem.button?.target = self
        statusItem.button?.action = #selector(togglePopover)
        controller.start()
        DispatchQueue.main.async { [weak self] in
            self?.togglePopover()
        }
    }

    func applicationShouldTerminateAfterLastWindowClosed(_ sender: NSApplication) -> Bool {
        false
    }

    func applicationShouldHandleReopen(_ sender: NSApplication, hasVisibleWindows flag: Bool) -> Bool {
        if !popover.isShown {
            togglePopover()
        }
        return true
    }

    func applicationShouldTerminate(_ sender: NSApplication) -> NSApplication.TerminateReply {
        if controller.isWorking {
            let alert = NSAlert()
            alert.messageText = "Factory jobs are still working"
            alert.informativeText = "Turning projects Off prevents new work. Running agents will finish in the background. Quit Factory Control anyway?"
            alert.addButton(withTitle: "Turn Off and Quit")
            alert.addButton(withTitle: "Keep Running")

            guard alert.runModal() == .alertFirstButtonReturn else {
                return .terminateCancel
            }
        }

        controller.requestQuit {
            NSApp.reply(toApplicationShouldTerminate: true)
        }
        return .terminateLater
    }

    @objc private func togglePopover() {
        guard let button = statusItem.button else {
            return
        }

        if popover.isShown {
            popover.performClose(nil)
        } else {
            popover.show(relativeTo: button.bounds, of: button, preferredEdge: .minY)
            NSApp.activate(ignoringOtherApps: true)
        }
    }
}

@main
@MainActor
struct FactoryControlApplication {
    static func main() {
        let application = NSApplication.shared
        let delegate = FactoryAppDelegate()
        application.delegate = delegate
        withExtendedLifetime(delegate) {
            application.run()
        }
    }
}

private struct FactoryPopover: View {
    @ObservedObject var controller: FactoryController

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                VStack(alignment: .leading, spacing: 3) {
                    Text("Factory Control")
                        .font(.title3.weight(.semibold))
                    Text(controller.connected ? "Projects start Off after launch" : "Backend unavailable")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
                Spacer()
                Button("Add Project") {
                    addProject()
                }
                .buttonStyle(.borderedProminent)
                .disabled(!controller.connected)
            }

            if let errorMessage = controller.errorMessage {
                Label(errorMessage, systemImage: "exclamationmark.triangle.fill")
                    .font(.caption)
                    .foregroundStyle(.red)
                    .fixedSize(horizontal: false, vertical: true)
            }

            if controller.projects.isEmpty {
                ContentUnavailableView(
                    "No projects yet",
                    systemImage: "folder.badge.plus",
                    description: Text("Add a project folder and describe the work you want its factory to continue.")
                )
                .frame(maxWidth: .infinity, maxHeight: .infinity)
            } else {
                ScrollView {
                    VStack(spacing: 10) {
                        ForEach(controller.projects) { project in
                            ProjectCard(project: project, controller: controller)
                        }
                    }
                    .padding(.vertical, 2)
                }
            }

            Divider()
            HStack {
                Text("Off prevents new work. Running agents can finish.")
                    .font(.caption2)
                    .foregroundStyle(.secondary)
                Spacer()
                Button("Quit") {
                    NSApp.terminate(nil)
                }
                .keyboardShortcut("q", modifiers: .command)
            }
        }
        .padding(14)
        .frame(width: 380, height: 510)
    }

    private func addProject() {
        let folderPanel = NSOpenPanel()
        folderPanel.canChooseFiles = false
        folderPanel.canChooseDirectories = true
        folderPanel.allowsMultipleSelection = false
        folderPanel.prompt = "Choose Project"

        guard folderPanel.runModal() == .OK,
              let folderURL = folderPanel.url else {
            return
        }

        let instructionSheet = NSAlert()
        instructionSheet.messageText = "What should this factory work on?"
        instructionSheet.informativeText = "The project will be added Off. You can edit this instruction before adding it."
        instructionSheet.addButton(withTitle: "Add Off")
        instructionSheet.addButton(withTitle: "Cancel")

        let instructionField = NSTextField(string: "Continue the next ready task in this project, following its instructions and tracker.")
        instructionField.frame = NSRect(x: 0, y: 0, width: 340, height: 64)
        instructionField.usesSingleLineMode = false
        instructionField.cell?.wraps = true
        instructionSheet.accessoryView = instructionField

        guard instructionSheet.runModal() == .alertFirstButtonReturn else {
            return
        }

        let chosenGoal = instructionField.stringValue.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !chosenGoal.isEmpty else {
            controller.showError("Enter an instruction before adding the project.")
            return
        }

        controller.addProject(path: folderURL.path, goal: chosenGoal)
    }
}

private struct ProjectCard: View {
    let project: FactoryProject
    @ObservedObject var controller: FactoryController

    private var projectURL: URL {
        URL(fileURLWithPath: project.path, isDirectory: true)
    }

    private var projectIsBusy: Bool {
        project.planning || project.runs.contains { run in
            ["queued", "launching", "planning", "working", "running"].contains(run.status.lowercased())
        }
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 9) {
            HStack(alignment: .top) {
                VStack(alignment: .leading, spacing: 3) {
                    Text(project.name)
                        .font(.headline)
                    Text(project.path)
                        .font(.caption2)
                        .foregroundStyle(.secondary)
                        .lineLimit(1)
                        .truncationMode(.middle)
                }
                Spacer(minLength: 8)
                Text(project.enabled ? "On" : "Off")
                    .font(.caption.weight(.medium))
                    .foregroundStyle(project.enabled ? .green : .secondary)
                Toggle("On", isOn: Binding(
                    get: { project.enabled },
                    set: { controller.setEnabled($0, for: project) }
                ))
                .labelsHidden()
                .toggleStyle(.switch)
                .accessibilityLabel("\(project.name) factory \(project.enabled ? "On" : "Off")")
                .disabled(!controller.connected || controller.shuttingDown || controller.pendingProjectIds.contains(project.id))
            }

            Text(project.goal)
                .font(.callout)
                .lineLimit(3)
                .fixedSize(horizontal: false, vertical: true)

            if project.planning {
                Label("Selecting next work", systemImage: "arrow.trianglehead.2.clockwise.rotate.90")
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }

            if let projectMessage = project.message {
                Text(projectMessage)
                    .font(.caption)
                    .foregroundStyle(.secondary)
                    .fixedSize(horizontal: false, vertical: true)
            }

            if project.runs.isEmpty {
                Text("No current jobs")
                    .font(.caption)
                    .foregroundStyle(.secondary)
            } else {
                VStack(alignment: .leading, spacing: 5) {
                    ForEach(project.runs) { run in
                        VStack(alignment: .leading, spacing: 2) {
                            HStack(alignment: .firstTextBaseline, spacing: 5) {
                                Text(run.issueId.isEmpty ? run.title : "\(run.issueId) · \(run.title)")
                                    .lineLimit(2)
                                Spacer(minLength: 3)
                                Text(run.status.capitalized)
                                    .foregroundStyle(.secondary)
                            }
                            if let runMessage = run.message, !runMessage.isEmpty {
                                Text(runMessage)
                                    .foregroundStyle(.secondary)
                                    .lineLimit(2)
                            }
                        }
                        .font(.caption)
                    }
                }
            }

            HStack(spacing: 8) {
                Button("Open Folder") {
                    NSWorkspace.shared.open(projectURL)
                }
                Button("Open Logs") {
                    controller.openLogs(for: project)
                }
                Spacer()
                Button("Remove") {
                    controller.removeProject(project)
                }
                .disabled(!controller.connected || controller.shuttingDown || project.enabled || projectIsBusy || controller.pendingProjectIds.contains(project.id))
                .help("Projects can be removed only while Off and idle.")
            }
            .buttonStyle(.borderless)
            .font(.caption)
        }
        .padding(11)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(.quaternary, in: RoundedRectangle(cornerRadius: 10))
    }
}
