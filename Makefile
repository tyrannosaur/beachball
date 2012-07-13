# Make sure that minifyjs and stylus are installed via
#  npm install minifyjs stylus

STYLUS = $(wildcard style/*.styl)
CSS = $(STYLUS:.styl=.css)

JS = $(wildcard js/*.js)
MIN_JS = $(JS:.js=.min.js)

IMAGES = images
SITE = site
BUILD = build

all: copy-site $(CSS) $(MIN_JS)

clean:
	rm -rf $(wildcard $(BUILD)/*)

copy-site:
	@echo '==> Copying site files'
	@test -d $(BUILD) || mkdir $(BUILD)
	@cp -R $(wildcard $(SITE)/*) $(BUILD)
	@cp -R $(IMAGES) $(BUILD)

%.css: %.styl
	@echo '==> Generating CSS with stylus for file $<'
	@test -d $(BUILD)/`dirname $@` || mkdir -p $(BUILD)/`dirname $@`
	node_modules/stylus/bin/stylus -c < $< > $(BUILD)/$@ 

%.min.js: %.js
	@echo '==> Minifying JavaScript file $<'
	@test -d $(BUILD)/`dirname $@` || mkdir -p $(BUILD)/`dirname $@`
	node_modules/minifyjs/bin/minify --level 2 --engine uglify $< > $(BUILD)/$@
