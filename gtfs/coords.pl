#!/usr/bin/perl

use common::sense;
use Data::Dump;
use DBI;

use utf8;
use locale;

my ($sqlite, $stem) = @ARGV;

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

my %stops;

foreach my $d (@$data) {
  my ($id, $name, $lat, $lon, $zone, $loctype, $zonetype) = @$d;
  next if $name =~ /,/; # drop non-prague zastávky
  my $in_zone = 0;
  map { /^[P0B]$/ and $in_zone++ } split /,/, $zone;
  push @{$stops{$name}}, {
    id => $id,
    lat => $lat,
    lon => $lon,
    zone => $zone,
    loctype => $loctype,
    zonetype => $zonetype,
  } if $in_zone;
}

my %slines;

foreach my $l (@$lines) {
  my ($short, $long, $id) = @$l;
  push @{$slines{$id}}, [ $short, $long ];
}

open F, ">:utf8", "$stem-coords-full.md" or die $!;
open S, ">:utf8", "$stem-coords-short.md" or die $!;
open G, ">:utf8", "$stem.gpx" or die $!;

print G '<?xml version="1.0" encoding="utf-8"?><gpx xmlns="http://www.topografix.com/GPX/1/1" version="1.1" creator="https://mapy.com/">';

foreach my $s (sort { $a cmp $b } keys %stops) {
  my ($lat, $lon);
  foreach my $i (@{$stops{$s}}) {
    dd $stops{$s} and die "lat $i->{lat}" if $i->{lat} > 50.2;
    dd $stops{$s} and die "lat $i->{lat}" if $i->{lat} < 49.5;
    dd $stops{$s} and die "lon $i->{lon}" if $i->{lon} < 14;
    dd $stops{$s} and die "lon $i->{lon}" if $i->{lon} > 14.7;

    $lat += $i->{lat};
    $lon += $i->{lon};
  }

  $lat /= @{$stops{$s}};
  $lon /= @{$stops{$s}};

  say S "- $s: [$lat, $lon](https://mapy.com/en/turisticka?q=$lat%2C$lon&source=coor&z=17)";
  print G "<wpt lat='$lat' lon='$lon'><name>$s</name></wpt>";
  say F "$s: $lat, $lon";
  foreach my $i (@{$stops{$s}}) {
    my $loclines = join ", ", sort { $a <=> $b || $a cmp $b } map { $_->[0] } @{$slines{$i->{id}}};
    say F "- $i->{id} ($loclines): [$i->{lat}, $i->{lat}](https://mapy.com/en/turisticka?q=$i->{lat}%2C$i->{lon}&source=coor&z=17)";
  }
  say F "";
}

close F;
close S;

print G "</gpx>";
close G;
