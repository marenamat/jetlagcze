#!/usr/bin/perl

use common::sense;
use Data::Dump;

# sudo apt install libdbi-perl libcommon-sense-perl libdbd-sqlite3-perl
#
# wget https://data.pid.cz/PID_GTFS.zip -O /tmp/PID_GTFS.zip
# mkdir /tmp/pid_gtfs
# cd /tmp/pid_gtfs
# unzip /tmp/PID_GTFS.zip

opendir D, "/tmp/pid_gtfs" or die $!;
my @files = grep { /^[^.]/ } readdir (D);
closedir D;

open S, "|-", "sqlite3 -separator ',' pid_gtfs.sqlite" or die "sqlite3 $!";

foreach my $f (@files) {
  say "processing $f";
  open F, "<", "/tmp/pid_gtfs/$f" or die "open $f", $!;
  my $tn = $f; $tn =~ s/.txt$//;
  #  say join ", ", map { chomp; $_ . " text" } split /,/, <F>;
  print S "CREATE TABLE $tn ( " . (
      join ", ", map { chomp; $_ . " text" } split /,/, <F>
    ) . " );\n";
  print S ".import /tmp/pid_gtfs/$f $tn\n";
}
