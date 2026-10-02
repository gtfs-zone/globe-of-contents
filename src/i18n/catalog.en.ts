/** list.gtfs.zone's UI strings, in English: the source of the keys. */
export const en = {
  'app.title': 'list.gtfs.zone - Every public GTFS feed',

  'shell.loading': 'Loading the catalogue',
  'shell.browse': 'Browse',
  'shell.guide': 'Guide',
  'shell.search': 'Search feeds, operators, places',
  'shell.checked': 'Checked {date}',
  'nav.theme': 'Toggle theme',

  'boot.loadingOf': 'Loading the catalogue ({received} of {total})',
  'boot.loadingBytes': 'Loading the catalogue ({received})',
  'boot.failed': 'Could not load the catalogue: {message}',
  'boot.failedPanel': 'The catalogue did not load.',
  'boot.retry': 'Retry',
  'boot.noFeed': 'Nothing in this catalogue matches the linked feed',
  'boot.noSource': 'Nothing in this catalogue matches the linked source',
  'boot.detailFailed': 'Could not load the catalog sources: {message}',

  'kind.static': 'Schedule',
  'kind.rt': 'Realtime',

  'content.ok': 'Valid GTFS zip',
  'content.not_zip': 'Not a zip',
  'content.missing_files': 'Missing GTFS files',
  'content.parse_error': 'Unreadable zip',
  'content.http_error': 'Download failed',
  'content.timeout': 'Download timed out',
  'content.memory': 'Too large to process',
  'content.error': 'Processing failed',

  'sniff.html': 'an HTML page',
  'sniff.json': 'JSON',
  'sniff.xml': 'XML',
  'sniff.empty': 'an empty response',

  'error.dns': 'DNS lookup failed',
  'error.tls': 'TLS error',
  'error.timeout': 'timed out',
  'error.refused': 'connection refused',
  'error.http_4xx': 'client error',
  'error.http_5xx': 'server error',

  'unit.bytes': '{n} B',

  'status.needsKey': 'needs an API key',
  'status.downSince': 'down since {date}',
  'status.upSince': 'up since {date}',
  'status.partialSince': 'partial since {date}',
  'status.notAnswering': 'not answering',
  'status.someRealtime': 'some realtime is not answering',

  'field.place': 'Place',
  'field.altNames': 'Also known as',
  'field.scheduleSize': 'Schedule size',
  'field.lastModified': 'Last modified',
  'field.scheduleContents': 'Schedule contents',
  'field.service': 'Service',
  'field.publisher': 'Publisher',
  'field.version': 'Version',
  'field.contents': 'Contents',
  'field.feedId': 'Feed id',
  'field.operator': 'Operator',
  'field.catalogId': 'Catalog id',
  'field.from': 'From',
  'field.catalogStatus': 'Catalog status',
  'field.license': 'License',
  'field.sameEndpoint': 'Same endpoint as',
  'field.redirectsTo': 'Redirects to',
  'field.state': 'State',
  'field.httpStatus': 'HTTP status',
  'field.error': 'Error',
  'field.latency': 'Latency',
  'field.failures': 'Failed checks in a row',
  'field.downSince': 'Down since',
  'field.stateSince': 'In this state since',
  'field.access': 'Access',

  'hint.place':
    'Where the catalog places this feed. Only the Mobility Database carries coordinates.',
  'hint.altNames':
    "Other names for this feed: its catalog entries', its operators' and the agencies in its schedule.",
  'hint.scheduleSize':
    "The schedule zip's size, from the Content-Length header of the last check.",
  'hint.lastModified':
    "The schedule's Last-Modified header from the last check.",
  'hint.scheduleContents':
    'What the last download of the schedule held, from sites.gtfs.zone, which builds a timetable site from it. Only checked for feeds it builds.',
  'hint.service':
    'The first and last service day in the schedule, from its calendars.',
  'hint.publisher': "The publisher named in the schedule's feed_info.txt.",
  'hint.version': "The version named in the schedule's feed_info.txt.",
  'hint.contents': 'Routes, stops and trips in the schedule.',
  'hint.feedId': "This merged feed's id on list.gtfs.zone.",
  'hint.operator':
    'The agency or organisation the catalog says runs this feed.',
  'hint.catalogId':
    "This entry's id in its catalog; links to the catalog's own page for it.",
  'hint.from': 'Where the catalog itself got this entry.',
  'hint.catalogStatus':
    "The catalog's own lifecycle for this entry: active, deprecated, inactive and so on.",
  'hint.license': 'The license the catalog lists for this feed.',
  'hint.sameEndpoint': 'Entries in other catalogs pointing at the same URL.',
  'hint.redirectsTo':
    'Where the URL ended up after following redirects on the last check.',
  'hint.state':
    'Up: answered on the last check. Down: failed it. Inaccessible: needs a key or was not checked. Click for the guide.',
  'hint.httpStatus': 'The status code of the last check.',
  'hint.error': 'Why the last check failed.',
  'hint.latency': 'How long the last check took to answer.',
  'hint.failures': 'Consecutive daily checks that failed.',
  'hint.downSince': 'When the URL stopped answering.',
  'hint.stateSince': 'When the current state was first seen.',
  'hint.access': 'URLs that need an API key are never checked.',

  'crumb.feed': 'Feed',
  'crumb.allFeeds': 'All feeds',
  'crumb.source': '{catalog} source',

  'detail.failed': 'The catalog sources did not load.',
  'detail.loading': 'Loading the catalog sources...',
  'unplaced.note': 'no coordinates, list only ({why})',
  'unplaced.why': 'why?',
  'unplaced.badge': 'unplaced',
  'unplaced.title': 'No coordinates',

  'home.feeds': 'Feeds',
  'home.onlyRealtime': 'Only feeds with realtime',
  'home.sources_one': '{count} source',
  'home.sources_other': '{count} sources',
  'home.matching_one': '{n} matching',
  'home.matching_other': '{n} matching',
  'home.firstShown': ', first {count} shown',
  'home.newestFirst': ', newest schedule first',
  'home.nearestFirst': ', nearest first',
  'home.unplaced': '({count} have no coordinates and are not on the map)',
  'home.noMatch': 'No feeds match these filters',
  'home.more': '{count} more; narrow the search to see them',
  'home.near': 'Near {name}',
  'home.clearNear': 'Stop sorting by distance',

  'feed.moreUrls_one': '{count} more URL from other catalogs',
  'feed.moreUrls_other': '{count} more URLs from other catalogs',
  'feed.catalogSources_one': '{count} catalog source',
  'feed.catalogSources_other': '{count} catalog sources',
  'feed.catalogSourcesPending': 'Catalog sources',
  'feed.openEditor': 'Open in editor',
  'feed.openViewer': 'Open in visualizer',
  'feed.contentSince': '{content}, since {date}',
  'feed.serviceRange': '{start} to {end}',
  'feed.contents': '{routes} routes, {stops} stops, {trips} trips',
  'feed.roles': 'Roles',
  'feed.howMerged': 'how feeds are merged',

  'source.redirect': 'the catalog entry points at a redirect',
  'source.urls': 'URLs',
  'source.lastCheck': 'Last check',

  'map.cluster':
    '{total} feeds: {up} up, {partial} partial, {down} down, {unknown} inaccessible',

  'help.overview.label': 'Overview',
  'help.overview.title': 'Every public GTFS feed, and whether it answers',
  'help.overview.lede':
    'Every public GTFS schedule and GTFS Realtime feed in the Transitland Atlas, the Mobility Database and rt.gtfs.zone, merged into one entry per transit system and checked every day.',
  'help.overview.search': 'Search',
  'help.overview.searchText':
    'Typing in the search box narrows the list and the map as you type, and offers the best matches in a dropdown: by name, place, or the host a feed is served from. Places and points of interest are offered under the matches; picking one moves the map there and lists the nearest feeds first. The counts at the top of the list filter it by state, and the switch under them to feeds with realtime.',
  'help.overview.browse': 'Browse',
  'help.overview.browseText':
    'The list puts the most recently modified schedules first, or the best matches first while searching. Pick a feed from the list, the map or the dropdown to see its schedule and realtime URLs, and every catalog entry it was built from.',
  'help.overview.open': 'Open it',
  'help.overview.openText':
    'A feed with a schedule opens in the editor; one with a schedule and realtime also opens in the visualizer.',
  'help.overview.version': 'Version {version}',

  'help.states.label': 'Up, partial, down, inaccessible',
  'help.states.title': 'What up, partial, down and inaccessible mean',
  'help.states.check':
    'Once a day every URL is asked for its headers only: a HEAD request, or a one-byte ranged GET when the server refuses HEAD. No feed is downloaded.',
  'help.states.url':
    'A URL is up when it answered with a success, possibly after redirects, and down when the check failed: DNS, TLS, a timeout, a refused connection or an HTTP error. A URL that needs an API key is never checked.',
  'help.states.roles':
    'A feed has roles: its schedule, and its realtime trip updates, vehicle positions and service alerts. A role is up when any of its URLs answered, so one catalog listing a mistyped URL does not take down a feed whose other URL works. The feed itself is:',
  'help.states.up': 'Up',
  'help.states.upText': 'Its schedule and every realtime role answered.',
  'help.states.partial': 'Partial',
  'help.states.partialText':
    'Its schedule answered, but at least one realtime role did not. Without a checked schedule, some realtime roles answered and some did not.',
  'help.states.down': 'Down',
  'help.states.downText':
    'Its schedule did not answer. "Down since" is when it stopped answering. Without a checked schedule, none of its realtime roles answered.',
  'help.states.unknown': 'Inaccessible',
  'help.states.unknownText':
    'Nothing it lists could be checked: every URL needs an API key, or none has been checked yet.',
  'help.states.chips':
    'The chips on each feed are its realtime roles: TU for trip updates, VP for vehicle positions, SA for service alerts, and RT for a realtime URL whose catalog does not say which of the three it serves. Each is green when it answered the last check, red when it did not, and grey when it was not checked.',

  'help.merging.label': 'How feeds are merged',
  'help.merging.title': 'How catalog entries become one feed',
  'help.merging.lede':
    'The catalogs list the same transit system separately, and often split its schedule and realtime into separate entries. Here they are merged into one feed per system, and nothing is dropped: each feed links to every catalog entry it came from.',
  'help.merging.sameUrl':
    'Entries naming the same URL, once normalized, are the same feed.',
  'help.merging.crossRef':
    'Mobility Database cross-references between a schedule and its realtime join them.',
  'help.merging.realtime':
    'Realtime URLs on the same host and path that differ only in a last vehicles, trips or alerts segment are one feed.',
  'help.merging.noFuzzy':
    'There is no fuzzy matching on names, so two entries for the same system with different URLs and no cross-reference stay separate. A feed keeps its id across days as long as most of its entries stay together.',
  'help.merging.names':
    "The name is the Transitland operator's, else the Mobility Database provider's (its feed name becomes the subtitle), else the single agency the schedule names, else any catalog entry's. Every other name is kept, and search finds the feed by any of them.",

  'help.unplaced.label': 'Unplaced feeds',
  'help.unplaced.title': 'Why some feeds are not on the map',
  'help.unplaced.coordinates':
    'Coordinates come from the Mobility Database, which records a location and a bounding box for most of its feeds. Transitland Atlas entries carry no place at all, so a Transitland-only feed has nowhere to be drawn.',
  'help.unplaced.merged':
    'A feed that merges a Transitland entry with a Mobility Database one takes the Mobility Database place. The rest are listed but not mapped, and the count of them is always shown next to the map rather than quietly left out.',

  'help.sources.label': 'Where the data comes from',
  'help.sources.title': 'Where the data comes from',
  'help.sources.lede':
    'Four catalogs, refreshed daily by gtfs-zone-feed-catalog:',
  'help.sources.transitland': '{link}: the open DMFR corpus, {license}',
  'help.sources.mobilitydatabase':
    "{link}: MobilityData's catalog, with places, {license}",
  'help.sources.gtfszone':
    '{link}: the realtime feeds gtfs.zone serves itself, such as Amtrak',
  'help.sources.ntd':
    '{link}: the GTFS weblinks US transit agencies report to the FTA, public domain',
  'help.sources.json':
    'Everything this page shows is published as JSON at {link}: {search} for the merged feeds in brief, {feeds} for them in full, {sources} for the catalog entries and {status} for each check.',
  'help.sources.licenses':
    "The catalogs list where feeds are; the feeds themselves belong to their publishers. Each feed's page links the license its catalog records, and that license, not this site's, is what covers the data.",
} as const;
