#!/usr/bin/env python
import glob, os, shutil, stat
import slimit

ROOT = r'../'
HTML = r'../*.html'
JS   = r'../js/*.js'

def min_name(path):
   path, ext = os.path.splitext(path)
   return '{0}.min{1}'.format(path, ext)      

def minify():
   min_scripts = {}

   js_files = [os.path.abspath(name) for name in glob.glob(JS) if not name.endswith('min.js')]
   html_files = [os.path.abspath(name) for name in glob.glob(HTML) if not name.endswith('min.html')]
   
   for name in js_files:     
      print('minifying {0}'.format(name))
      with open(name, 'rb') as js:
         text = js.read()

      min_scripts[name] = min_name(name)      
      text = slimit.minify(text, mangle=True)
      with open(min_scripts[name], 'wb') as js:
         js.write(text)
   
   for name in html_files:         
      print('writing new {0}'.format(name))
      with open(name, 'rb') as html:
         text = html.read()         
      
      name = min_name(name)
      with open(name, 'wb') as html:
         for name in min_scripts:            
            text = text.replace(os.path.split(name)[1], os.path.split(min_scripts[name])[1])
         html.write(text)
         
if __name__ == '__main__':
   minify()