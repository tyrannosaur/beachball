#!python
from flask import Flask, request, render_template, redirect, url_for

HOST = "0.0.0.0"
PORT = 5000

app = Flask(__name__)
app.config.from_object(__name__)

@app.errorhandler(404)
def page_not_found(error):
   return render_template('404.html', error=error), 404

@app.route('/')
def home():
   return render_template('index.html')

if __name__ == "__main__":
  app.run(app.config['HOST'], app.config['PORT'])
