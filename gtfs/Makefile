MAKEFLAGS += -rR

# What to build
ALL := \
       pid \
       prg \

all: $(addsuffix -coords-full.md,$(ALL))

# Sources
pid.zip: SOURCE := https://data.pid.cz/PID_GTFS.zip

# Links for common sources
prg.sqlite: pid.sqlite
	cp $< $@

%.zip:
	wget $(SOURCE) -O $@

%/.unzipped: %.zip
	unzip -d $(dir $@) $<
	touch $@

%.sqlite: %/.unzipped import.pl
	perl import.pl $(dir $<) $@

%.gpx %-coords-full.md %-coords-short.md: %.sqlite coords.pl %.pm
	perl coords.pl $< $*

.PHONY: all
