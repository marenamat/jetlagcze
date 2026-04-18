package coords_plugin;

sub filter {
  my ($data) = @_;
  my %stops;

  foreach my $d (@$data) {
    my ($id, $name, $lat, $lon, $zone, $loctype, $zonetype) = @$d;
    next if $name =~ /,/; # drop non-prague zastávky
    my $in_zone = 0;
    map { /^[P0B]$/ and $in_zone++ } split /,/, $zone;
    next unless $in_zone;
    push @{$stops{$name}}, {
      name => $name,
      id => $id,
      lat => $lat,
      lon => $lon,
      zone => $zone,
      loctype => $loctype,
      zonetype => $zonetype,
    }; 
  }

  return \%stops;
}

our $limits = {
  minlat => 49.5,
  maxlat => 50.2,
  minlon => 14,
  maxlon => 14.7,
};

42;
