"""Start the upstream Blender MCP addon in this disposable GUI process."""
import importlib.util
import os
import sys
from pathlib import Path
import bpy

os.environ['DISABLE_TELEMETRY'] = 'true'
root = Path(__file__).resolve().parents[1]
addon_path = root / '.tools' / 'blender-addons' / 'blender_mcp.py'
if not addon_path.exists():
    raise RuntimeError('Run npm run visual:setup first')
spec = importlib.util.spec_from_file_location('blender_mcp', addon_path)
addon = importlib.util.module_from_spec(spec)
sys.modules[spec.name] = addon
spec.loader.exec_module(addon)
addon.register()
server = getattr(bpy.types, 'blendermcp_server', None)
if server is None or not server.running:
    server = addon.BlenderMCPServer(host='127.0.0.1', port=9876)
    server.start()
if not server.running:
    raise RuntimeError('The Blender MCP listener did not start')
print('DUSTLINE_BLENDER_BRIDGE_READY 127.0.0.1:9876', flush=True)
# Blender owns its GUI event loop; upstream dispatches commands on its main thread.
