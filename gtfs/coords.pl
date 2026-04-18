#!/usr/bin/perl

use common::sense;
use Data::Dump;
use DBI;

use utf8;
use locale;

my ($sqlite, $stem) = @ARGV;

require "./$stem.pm" if -f "./$stem.pm";

# export LC_COLLATE=cs_CZ.utf-8 LC_CTYPE=cs_CZ.utf-8 LC_NUMERIC=en_US.UTF-8

my $dbh = DBI->connect("dbi:SQLite:dbname=$sqlite", "", "",
  { AutoCommit => 0, RaiseError => 1, sqlite_unicode => 1 }) or die $!;

my $data = $dbh->selectall_arrayref('
  SELECT stop_id, stop_name, stop_lat, stop_lon, zone_id, location_type, zone_region_type
  FROM stops
  WHERE stop_name != "" AND zone_id != "" AND zone_id != "-"
  ');
#   WHERE location_type = 0, -> jenom stálý

my $lines = $dbh->selectall_arrayref('
  SELECT DISTINCT r.route_short_name, r.route_long_name, s.stop_id
  FROM routes AS r
  JOIN trips AS t ON (t.route_id = r.route_id)
  JOIN stop_times AS s ON (t.trip_id = s.trip_id)
  ');

my %stops = %{coords_plugin::filter($data)};
my $lim = $coords_plugin::limits;

my %slines;

foreach my $l (@$lines) {
  my ($short, $long, $id) = @$l;
  push @{$slines{$id}}, [ $short, $long ];
}

open F, ">:utf8", "$stem-coords-full.md" or die $!;
open S, ">:utf8", "$stem-coords-short.md" or die $!;
open G, ">:utf8", "$stem.gpx" or die $!;

print G '<?xml version="1.0" encoding="utf-8"?><gpx xmlns="http://www.topografix.com/GPX/1/1" version="1.1" creator="https://mapy.com/">';

foreach my $s (sort { $stops{$a}[0]{name} cmp $stops{$b}[0]{name} } keys %stops) {
  my ($lat, $lon);
  foreach my $i (@{$stops{$s}}) {
    dd $stops{$s} and die "lat $i->{lat}" if exists $lim->{maxlat} and $i->{lat} > $lim->{maxlat};
    dd $stops{$s} and die "lat $i->{lat}" if exists $lim->{minlat} and $i->{lat} < $lim->{minlat};
    dd $stops{$s} and die "lon $i->{lon}" if exists $lim->{minlon} and $i->{lon} < $lim->{minlon};
    dd $stops{$s} and die "lon $i->{lon}" if exists $lim->{maxlon} and $i->{lon} > $lim->{maxlon};

    $lat += $i->{lat};
    $lon += $i->{lon};
  }

  $lat /= @{$stops{$s}};
  $lon /= @{$stops{$s}};

  my %n = map +( $_->{name} => 1 ), @{$stops{$s}};
  my $names = join ", ", sort { $a cmp $b } keys %n;

  say S "- $names: [$lat, $lon](https://mapy.com/en/turisticka?q=$lat%2C$lon&source=coor&z=17)";
  print G "<wpt lat='$lat' lon='$lon'><name>$names</name></wpt>";
  say F "$names: $lat, $lon";
  foreach my $i (@{$stops{$s}}) {
    my $loclines = join ", ", sort { $a <=> $b || $a cmp $b } map { $_->[0] } @{$slines{$i->{id}}};
    say F "- $i->{id} $i->{name} ($loclines): [$i->{lat}, $i->{lat}](https://mapy.com/en/turisticka?q=$i->{lat}%2C$i->{lon}&source=coor&z=17)";
  }
  say F "";
}

close F;
close S;

print G "</gpx>";
close G;
