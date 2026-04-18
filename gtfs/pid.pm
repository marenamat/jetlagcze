package coords_plugin;

sub filter {
  my ($data) = @_;
  my %stops;

  foreach my $d (@$data) {
    my ($id, $name, $lat, $lon, $zone, $loctype, $zonetype) = @$d;
    $id =~ /U([0-9]+)[A-Z][0-9]+/ or warn "Stop with id $id" and next;
    my $metaid = "U$1";
    my $in_zone = 0;
    push @{$stops{$metaid}}, {
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

our $limits = {};

42;
