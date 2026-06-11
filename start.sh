#!/bin/bash
echo "=== Démarrage COLOMB Demo ==="
python demo_init.py
echo "=== Lancement uvicorn ==="
exec uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000}
