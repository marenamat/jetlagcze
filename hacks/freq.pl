#!/usr/bin/perl

use common::sense;
use Data::Dump;
use DBI;

use utf8;

my $dbh = DBI->connect("dbi:SQLite:dbname=pid_gtfs.sqlite", "", "",
  { AutoCommit => 1, RaiseError => 1 }) or die $!;

my $query;

$query = $dbh->prepare('
  SELECT service_id, exception_type FROM calendar_dates
  WHERE date = "20260403"');
$query->execute();
my %exc = %{$query->fetchall_hashref('service_id')};

say "Loaded " . (scalar %exc) . " exceptions";
#dd \%exc;

$query = $dbh->prepare('
  SELECT service_id FROM calendar
  WHERE friday = "1" AND start_date <= "20260403" AND end_date >= "20260403"');
$query->execute();

my $cnt = 0;
while (my $r = $query->fetchrow_arrayref())
{
  $cnt++;
  next if $exc{$r->[0]}{exception_type} eq "2"; # removed this day
  $exc{$r->[0]} = { service_id => $r->[0] }; # regular this day
}
say "Loaded $cnt regular services";

foreach my $r (keys %exc) {
  if ($exc{$r}{exception_type} eq "2") {
    delete $exc{$r};
  } else {
    $exc{$r} = 1;
  }
}

say "Reduced to " . (scalar %exc) . " available services";

#dd \%exc;

my $trips = $dbh->prepare('
  SELECT
    st.trip_id,
    st.departure_time,
    st.stop_id,
    s.stop_name,
    tr.service_id,
    tr.trip_headsign,
    r.route_short_name
  FROM stop_times AS st
  JOIN stops AS s ON (s.stop_id = st.stop_id)
  JOIN trips AS tr ON (st.trip_id = tr.trip_id)
  JOIN routes AS r ON (r.route_id = tr.route_id)
  WHERE (
       s.zone_id = "P"
    OR s.zone_id = "0"
    OR s.zone_id = "B"
    OR s.zone_id = "P,0"
    OR s.zone_id = "0,B"
  )
  ');
$trips->execute();

my %stop_times;

my $cnt = 0;
while (my $hr = $trips->fetchrow_hashref())
{
  push @{$stop_times{$hr->{stop_name}}}, $hr and $cnt++ if $exc{$hr->{service_id}};
  #  last if $cnt > 1000;
}

my %stop_info;

foreach my $k (keys %stop_times) {
  my %sids;
  my @st =
  sort { $a->{departure_time} cmp $b->{departure_time} }
  grep { $_->{departure_time} ge "08:00:00" and $_->{departure_time} le "21:00:00" }
  @{$stop_times{$k}};

  next if scalar @st < 5;
  next if $st[0]->{departure_time} gt "10:00:00";
  next if $st[$#st]->{departure_time} lt "19:00:00";

  map {
    my ($h, $m, $s) = split /:0?/, $_->{departure_time};
    $_->{numtime} = 3600*(int $h) + 60*(int $m) + (int $s);
    $sids{$_->{stop_id}}++;
  } @st;

  my $sidcnt = scalar keys %sids;

  my (@difs, @difsorted);
  my $window = ($sidcnt == 1) ? 2 : 4;
  my $difsum = 0;

  for (my $i=0; $i+$window<@st; $i++)
  {
    my $d = $st[$i+$window]->{numtime} - $st[$i]->{numtime};
    $difsum += $d;
    push @difs, $d;
  }

  my $difavg = $difsum / @difs;
  my @difsorted = sort { $a <=> $b } @difs;
  my $difmin = $difsorted[0];
  my $difmax = $difsorted[$#difs];

  $stop_info{$k} = {
    difmin => $difmin,
    difmax => $difmax,
    difavg => $difavg,
    sidcnt => $sidcnt,
    times => [ @st ],
  };
}

foreach my $k (sort {$stop_info{$b}->{difavg} <=> $stop_info{$a}->{difavg}} keys %stop_info) {
  my $si = $stop_info{$k};
  say "$k: ", scalar @{$si->{times}}, ", $si->{difmin}, $si->{difavg}, $si->{difmax}";

  foreach my $t (@{$si->{times}})
  {
    say "  $t->{departure_time} ($t->{numtime}) \@$t->{stop_id}: $t->{route_short_name} -> $t->{trip_headsign}";
  }
}

#dd \%stop_times;
