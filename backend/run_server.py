"""
WeighReport & MetroCert - FastAPI Backend Server Launcher
Starts Uvicorn server on port 8000 with CORS and full OIML R 76-2 Engine.
"""
import os
import sys

# Ensure backend root and packages directories are in sys.path
backend_dir = os.path.dirname(os.path.abspath(__file__))
venv_python = os.path.join(backend_dir, ".venv", "Scripts", "python.exe")
if os.path.exists(venv_python) and os.path.abspath(sys.executable).lower() != os.path.abspath(venv_python).lower():
    import subprocess
    sys.exit(subprocess.call([venv_python] + sys.argv))

packages_dir = os.path.join(backend_dir, "packages")

if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)
if packages_dir not in sys.path:
    sys.path.insert(0, packages_dir)

import uvicorn
from apps.api.main import app

def main():
    print("=" * 70)
    print("Starting MetroCert / WeighReport OIML R-76 Metrology Engine Server")
    print("API Server: http://127.0.0.1:8000")
    print("Swagger Docs: http://127.0.0.1:8000/docs")
    print("OIML R 76-2 Report Generation: Active (ReportLab + Python-Docx)")
    print("=" * 70)
    uvicorn.run(app, host="127.0.0.1", port=8000, log_level="info")

if __name__ == "__main__":
    main()
