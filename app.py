# =============================================================================
# app.py  —  TruthLens Flask server (LOCAL DEVELOPMENT ONLY)
# -----------------------------------------------------------------------------
# For Netlify deployment you do NOT need this file.
# Use this only if you want to run the site on your own computer with Flask.
#
# HOW TO RUN LOCALLY:
#   1. pip install flask
#   2. python app.py
#   3. Open http://127.0.0.1:5000 in your browser
#
# NOTE: This version serves the static index.html directly — no Jinja2
#       template variables needed since the JS does all the work.
# =============================================================================

import os
from flask import Flask, send_from_directory

app = Flask(__name__, static_folder='static')

# Serve index.html at the root URL
@app.route('/')
def index():
    return send_from_directory('.', 'index.html')

# Serve anything in /static/ (style.css, script.js)
@app.route('/static/<path:filename>')
def static_files(filename):
    return send_from_directory('static', filename)

if __name__ == '__main__':
    print("\n" + "="*50)
    print("  TruthLens — Local Flask Server")
    print("="*50)
    print("  Open http://127.0.0.1:5000 in your browser")
    print("  Press Ctrl+C to stop\n")
    app.run(debug=True, host='0.0.0.0', port=5000)
