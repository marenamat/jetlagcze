#!/usr/bin/perl

use common::sense;
use Data::Dump;

# sudo apt install libdbi-perl libcommon-sense-perl libdbd-sqlite3-perl

my ($dirname, $sqlite) = @ARGV;

opendir D, "$dirname" or die $!;
my @files = grep { /^[^.]/ } readdir (D);
closedir D;

open S, "|-", "sqlite3 -separator ',' \"$sqlite\"" or die "sqlite3 $!";

foreach my $f (@files) {
  say "processing $f";
  open F, "<", "$dirname/$f" or die "open $f", $!;
  my $tn = $f; $tn =~ s/.txt$//;
  #  say join ", ", map { chomp; $_ . " text" } split /,/, <F>;
  print S "CREATE TABLE $tn ( " . (
      join ", ", map { chomp; $_ . " text" } split /,/, <F>
    ) . " );\n";
  print S ".import $dirname/$f $tn\n";
}
