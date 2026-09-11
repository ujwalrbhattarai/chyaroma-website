from __future__ import annotations

import socket
import subprocess
import sys
import time
from pathlib import Path


ROOT = Path(__file__).resolve().parent
FRONTEND_PORT = 5173
BACKEND_PORT = 3000
NGROK_DOMAIN = "breeder-carbon-identify.ngrok-free.dev"
NGROK_AUTHTOKEN = "3CcIHPIS6agCreHyucmXNFuwV4u_G9p5jA4cjifJDVxBhSp8"


def find_free_port(preferred_port: int) -> int:
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as client:
        try:
            client.bind(("127.0.0.1", preferred_port))
            return preferred_port
        except OSError:
            client.bind(("127.0.0.1", 0))
            return client.getsockname()[1]


def start_process(name: str, working_directory: Path, args: list[str]) -> subprocess.Popen[str]:
    process = subprocess.Popen(args, cwd=working_directory)
    print(f"{name} started in {working_directory} (PID {process.pid})")
    return process


def wait_for_port(port: int, timeout_seconds: int = 120) -> None:
    deadline = time.time() + timeout_seconds
    while time.time() < deadline:
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as client:
            client.settimeout(0.5)
            try:
                client.connect(("127.0.0.1", port))
                return
            except OSError:
                time.sleep(0.5)

    raise RuntimeError(f"Timed out waiting for 127.0.0.1:{port} to become available.")


def run_ngrok() -> int:
    ngrok_path = str(ROOT / "ngrok.exe")
    subprocess.run([ngrok_path, "config", "add-authtoken", NGROK_AUTHTOKEN], check=True)
    print(f"Opening ngrok tunnel for https://{NGROK_DOMAIN} -> http://127.0.0.1:{FRONTEND_PORT}")
    completed = subprocess.run([ngrok_path, "http", f"--domain={NGROK_DOMAIN}", str(FRONTEND_PORT)], check=False)
    return completed.returncode


def main() -> int:
    subprocess.run(["node", "bootstrap-db.mjs"], cwd=ROOT / "backend", check=True)

    backend = start_process("Backend", ROOT / "backend", ["npm.cmd", "run", "dev"])
    frontend_port = find_free_port(FRONTEND_PORT)
    frontend = start_process(
        "Frontend",
        ROOT / "frontend",
        ["npm.cmd", "run", "dev", "--", "--host", "0.0.0.0", "--port", str(frontend_port)],
    )

    try:
        wait_for_port(BACKEND_PORT)
        wait_for_port(frontend_port)
        ngrok_path = str(ROOT / "ngrok.exe")
        subprocess.run([ngrok_path, "config", "add-authtoken", NGROK_AUTHTOKEN], check=True)
        print(f"Opening ngrok tunnel for https://{NGROK_DOMAIN} -> http://127.0.0.1:{frontend_port}")
        completed = subprocess.run([ngrok_path, "http", f"--domain={NGROK_DOMAIN}", str(frontend_port)], check=False)
        return completed.returncode
    except KeyboardInterrupt:
        print("Stopping launcher...")
        return 130
    finally:
        for process in (frontend, backend):
            if process.poll() is None:
                process.terminate()


if __name__ == "__main__":
    sys.exit(main())
