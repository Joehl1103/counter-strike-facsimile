#define _POSIX_C_SOURCE 200809L
#define _DARWIN_C_SOURCE 1

#include <errno.h>
#include <fcntl.h>
#include <stdio.h>
#include <stdlib.h>
#include <sys/file.h>
#include <unistd.h>

static void write_error_response(const char *message) {
    (void)fprintf(stdout,
                  "{\"type\":\"state\",\"projects\":[],\"error\":\"%s\"}\n",
                  message);
    (void)fflush(stdout);
}

int main(int argument_count, char **arguments) {
    if (argument_count != 4) {
        write_error_response("The factory backend launcher received invalid arguments.");
        return 64;
    }

    const char *lock_path = arguments[1];
    const char *node_path = arguments[2];
    const char *bridge_path = arguments[3];
    const int lock_descriptor = open(lock_path, O_CREAT | O_RDWR, 0600);
    if (lock_descriptor < 0) {
        write_error_response("Factory Control could not open its dispatcher lock.");
        return 1;
    }

    if (fcntl(lock_descriptor, F_SETFD, 0) < 0) {
        write_error_response("Factory Control could not preserve its dispatcher lock.");
        return 1;
    }

    if (flock(lock_descriptor, LOCK_EX | LOCK_NB) < 0) {
        if (errno == EWOULDBLOCK || errno == EAGAIN) {
            write_error_response("Factory Control is already running. Use its existing menu-bar icon.");
        } else {
            write_error_response("Factory Control could not acquire its dispatcher lock.");
        }
        return 1;
    }

    char descriptor_text[32];
    const int descriptor_length = snprintf(descriptor_text,
                                           sizeof(descriptor_text),
                                           "%d",
                                           lock_descriptor);
    if (descriptor_length < 0 || (size_t)descriptor_length >= sizeof(descriptor_text)) {
        write_error_response("Factory Control could not prepare its dispatcher lock.");
        return 1;
    }

    if (setenv("FACTORY_LOCK_FD", descriptor_text, 1) != 0) {
        write_error_response("Factory Control could not pass its dispatcher lock to the backend.");
        return 1;
    }

    execl(node_path, node_path, bridge_path, (char *)NULL);
    write_error_response("Factory Control could not start the factory backend.");
    return 1;
}
