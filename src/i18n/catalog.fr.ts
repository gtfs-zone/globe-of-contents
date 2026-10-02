import type { Translation } from 'gtfs-zone-web-common/i18n/index';
import type { en } from './catalog.en';

/** list.gtfs.zone's UI strings, in French. */
export const fr: Translation<typeof en> = {
  'app.title': 'list.gtfs.zone - Tous les flux GTFS publics',

  'shell.loading': 'Chargement du catalogue',
  'shell.browse': 'Parcourir',
  'shell.guide': 'Guide',
  'shell.search': 'Rechercher flux, exploitants, lieux',
  'shell.checked': 'Vérifié le {date}',
  'nav.theme': 'Changer de thème',

  'boot.loadingOf': 'Chargement du catalogue ({received} sur {total})',
  'boot.loadingBytes': 'Chargement du catalogue ({received})',
  'boot.failed': 'Impossible de charger le catalogue : {message}',
  'boot.failedPanel': "Le catalogue n'a pas pu être chargé.",
  'boot.retry': 'Réessayer',
  'boot.noFeed': 'Rien dans ce catalogue ne correspond au flux du lien',
  'boot.noSource': 'Rien dans ce catalogue ne correspond à la source du lien',
  'boot.detailFailed':
    'Impossible de charger les sources du catalogue : {message}',

  'kind.static': 'Horaires',
  'kind.rt': 'Temps réel',

  'content.ok': 'Zip GTFS valide',
  'content.not_zip': "Ce n'est pas un zip",
  'content.missing_files': 'Fichiers GTFS manquants',
  'content.parse_error': 'Zip illisible',
  'content.http_error': 'Échec du téléchargement',
  'content.timeout': 'Délai de téléchargement dépassé',
  'content.memory': 'Trop volumineux à traiter',
  'content.error': 'Échec du traitement',

  'sniff.html': 'une page HTML',
  'sniff.json': 'du JSON',
  'sniff.xml': 'du XML',
  'sniff.empty': 'une réponse vide',

  'error.dns': 'échec de la résolution DNS',
  'error.tls': 'erreur TLS',
  'error.timeout': 'délai dépassé',
  'error.refused': 'connexion refusée',
  'error.http_4xx': 'erreur client',
  'error.http_5xx': 'erreur serveur',

  'unit.bytes': '{n} o',

  'status.needsKey': "nécessite une clé d'API",
  'status.downSince': 'hors service depuis le {date}',
  'status.upSince': 'en service depuis le {date}',
  'status.partialSince': 'partiel depuis le {date}',
  'status.notAnswering': 'ne répond pas',
  'status.someRealtime': 'une partie du temps réel ne répond pas',

  'field.place': 'Lieu',
  'field.altNames': 'Autres noms',
  'field.scheduleSize': 'Taille des horaires',
  'field.lastModified': 'Dernière modification',
  'field.scheduleContents': 'Contenu des horaires',
  'field.service': 'Service',
  'field.publisher': 'Éditeur',
  'field.version': 'Version',
  'field.contents': 'Contenu',
  'field.feedId': 'Identifiant du flux',
  'field.operator': 'Exploitant',
  'field.catalogId': 'Identifiant au catalogue',
  'field.from': 'Provenance',
  'field.catalogStatus': 'Statut au catalogue',
  'field.license': 'Licence',
  'field.sameEndpoint': 'Même adresse que',
  'field.redirectsTo': 'Redirige vers',
  'field.state': 'État',
  'field.httpStatus': 'Statut HTTP',
  'field.error': 'Erreur',
  'field.latency': 'Latence',
  'field.failures': 'Échecs consécutifs',
  'field.downSince': 'Hors service depuis',
  'field.stateSince': 'Dans cet état depuis',
  'field.access': 'Accès',

  'hint.place':
    'Où le catalogue situe ce flux. Seule la Mobility Database fournit des coordonnées.',
  'hint.altNames':
    'Les autres noms de ce flux : ceux de ses entrées de catalogue, de ses exploitants et des agences de ses horaires.',
  'hint.scheduleSize':
    "La taille du zip des horaires, d'après l'en-tête Content-Length de la dernière vérification.",
  'hint.lastModified':
    "L'en-tête Last-Modified des horaires lors de la dernière vérification.",
  'hint.scheduleContents':
    "Ce que contenait le dernier téléchargement des horaires, d'après sites.gtfs.zone, qui en construit un site d'horaires. Vérifié seulement pour les flux qu'il construit.",
  'hint.service':
    "Le premier et le dernier jour de service des horaires, d'après leurs calendriers.",
  'hint.publisher': "L'éditeur indiqué dans le feed_info.txt des horaires.",
  'hint.version': 'La version indiquée dans le feed_info.txt des horaires.',
  'hint.contents': 'Lignes, arrêts et courses des horaires.',
  'hint.feedId': "L'identifiant de ce flux fusionné sur list.gtfs.zone.",
  'hint.operator':
    "L'agence ou l'organisation qui exploite ce flux selon le catalogue.",
  'hint.catalogId':
    "L'identifiant de cette entrée dans son catalogue ; renvoie à la page du catalogue qui la décrit.",
  'hint.from': "D'où le catalogue tient lui-même cette entrée.",
  'hint.catalogStatus':
    'Le cycle de vie de cette entrée selon le catalogue : active, obsolète, inactive, etc.',
  'hint.license': 'La licence que le catalogue indique pour ce flux.',
  'hint.sameEndpoint':
    "Les entrées d'autres catalogues qui pointent vers la même URL.",
  'hint.redirectsTo':
    "Où l'URL a abouti après les redirections lors de la dernière vérification.",
  'hint.state':
    "En service : a répondu à la dernière vérification. Hors service : y a échoué. Inaccessible : nécessite une clé ou n'a pas été vérifié. Cliquez pour le guide.",
  'hint.httpStatus': 'Le code de statut de la dernière vérification.',
  'hint.error': 'Pourquoi la dernière vérification a échoué.',
  'hint.latency': 'Le temps de réponse lors de la dernière vérification.',
  'hint.failures': 'Les vérifications quotidiennes consécutives en échec.',
  'hint.downSince': "Quand l'URL a cessé de répondre.",
  'hint.stateSince':
    "Quand l'état actuel a été constaté pour la première fois.",
  'hint.access':
    "Les URL qui nécessitent une clé d'API ne sont jamais vérifiées.",

  'crumb.feed': 'Flux',
  'crumb.allFeeds': 'Tous les flux',
  'crumb.source': 'Source {catalog}',

  'detail.failed': "Les sources du catalogue n'ont pas pu être chargées.",
  'detail.loading': 'Chargement des sources du catalogue...',
  'unplaced.note': 'sans coordonnées, liste seulement ({why})',
  'unplaced.why': 'pourquoi ?',
  'unplaced.badge': 'non situé',
  'unplaced.title': 'Sans coordonnées',

  'home.feeds': 'Flux',
  'home.onlyRealtime': 'Seulement les flux avec temps réel',
  'home.sources_one': '{count} source',
  'home.sources_other': '{count} sources',
  'home.matching_one': '{n} correspondant',
  'home.matching_other': '{n} correspondants',
  'home.firstShown': ', {count} premiers affichés',
  'home.newestFirst': ', horaires les plus récents en premier',
  'home.nearestFirst': ', les plus proches en premier',
  'home.unplaced': '({count} sans coordonnées, absents de la carte)',
  'home.noMatch': 'Aucun flux ne correspond à ces filtres',
  'home.more': '{count} de plus ; affinez la recherche pour les voir',
  'home.near': 'Près de {name}',
  'home.clearNear': 'Ne plus trier par distance',

  'feed.moreUrls_one': "{count} autre URL d'autres catalogues",
  'feed.moreUrls_other': "{count} autres URL d'autres catalogues",
  'feed.catalogSources_one': '{count} source de catalogue',
  'feed.catalogSources_other': '{count} sources de catalogue',
  'feed.catalogSourcesPending': 'Sources de catalogue',
  'feed.openEditor': "Ouvrir dans l'éditeur",
  'feed.openViewer': 'Ouvrir dans le visualiseur',
  'feed.contentSince': '{content}, depuis le {date}',
  'feed.serviceRange': 'du {start} au {end}',
  'feed.contents': '{routes} lignes, {stops} arrêts, {trips} courses',
  'feed.roles': 'Rôles',
  'feed.howMerged': 'comment les flux sont fusionnés',

  'source.redirect': "l'entrée du catalogue pointe vers une redirection",
  'source.urls': 'URL',
  'source.lastCheck': 'Dernière vérification',

  'map.cluster':
    '{total} flux : {up} en service, {partial} partiels, {down} hors service, {unknown} inaccessibles',

  'help.overview.label': "Vue d'ensemble",
  'help.overview.title': "Tous les flux GTFS publics, et s'ils répondent",
  'help.overview.lede':
    "Tous les flux GTFS d'horaires et GTFS Realtime publics de l'Atlas Transitland, de la Mobility Database et de rt.gtfs.zone, fusionnés en une entrée par réseau de transport et vérifiés chaque jour.",
  'help.overview.search': 'Rechercher',
  'help.overview.searchText':
    "La saisie dans le champ de recherche filtre la liste et la carte au fil de la frappe, et propose les meilleures correspondances dans une liste déroulante : par nom, par lieu ou par l'hôte qui sert le flux. Les lieux et points d'intérêt sont proposés sous les correspondances ; en choisir un y déplace la carte et liste d'abord les flux les plus proches. Les compteurs en haut de la liste la filtrent par état, et l'interrupteur en dessous sur les flux avec temps réel.",
  'help.overview.browse': 'Parcourir',
  'help.overview.browseText':
    "La liste montre d'abord les horaires modifiés le plus récemment, ou les meilleures correspondances pendant une recherche. Choisissez un flux dans la liste, sur la carte ou dans la liste déroulante pour voir ses URL d'horaires et de temps réel, et chaque entrée de catalogue dont il est issu.",
  'help.overview.open': "L'ouvrir",
  'help.overview.openText':
    "Un flux avec des horaires s'ouvre dans l'éditeur ; un flux avec horaires et temps réel s'ouvre aussi dans le visualiseur.",
  'help.overview.version': 'Version {version}',

  'help.states.label': 'En service, partiel, hors service, inaccessible',
  'help.states.title':
    'Ce que signifient en service, partiel, hors service et inaccessible',
  'help.states.check':
    "Une fois par jour, seuls les en-têtes de chaque URL sont demandés : une requête HEAD, ou un GET d'un seul octet quand le serveur refuse HEAD. Aucun flux n'est téléchargé.",
  'help.states.url':
    "Une URL est en service quand elle a répondu avec succès, éventuellement après des redirections, et hors service quand la vérification a échoué : DNS, TLS, délai dépassé, connexion refusée ou erreur HTTP. Une URL qui nécessite une clé d'API n'est jamais vérifiée.",
  'help.states.roles':
    "Un flux a des rôles : ses horaires, et ses mises à jour de courses, positions de véhicules et alertes de service en temps réel. Un rôle est en service dès qu'une de ses URL a répondu : un catalogue qui liste une URL erronée ne met donc pas hors service un flux dont l'autre URL fonctionne. Le flux lui-même est :",
  'help.states.up': 'En service',
  'help.states.upText': 'Ses horaires et chaque rôle temps réel ont répondu.',
  'help.states.partial': 'Partiel',
  'help.states.partialText':
    "Ses horaires ont répondu, mais au moins un rôle temps réel non. Sans horaires vérifiés, certains rôles temps réel ont répondu et d'autres non.",
  'help.states.down': 'Hors service',
  'help.states.downText':
    "Ses horaires n'ont pas répondu. « Hors service depuis » indique quand ils ont cessé de répondre. Sans horaires vérifiés, aucun de ses rôles temps réel n'a répondu.",
  'help.states.unknown': 'Inaccessible',
  'help.states.unknownText':
    "Rien de ce qu'il liste n'a pu être vérifié : chaque URL nécessite une clé d'API, ou aucune n'a encore été vérifiée.",
  'help.states.chips':
    "Les pastilles de chaque flux sont ses rôles temps réel : TU pour les mises à jour de courses, VP pour les positions de véhicules, SA pour les alertes de service, et RT pour une URL temps réel dont le catalogue ne précise pas lequel des trois elle sert. Chacune est verte si elle a répondu à la dernière vérification, rouge sinon, et grise si elle n'a pas été vérifiée.",

  'help.merging.label': 'Fusion des flux',
  'help.merging.title': 'Comment les entrées de catalogue deviennent un flux',
  'help.merging.lede':
    'Les catalogues listent un même réseau séparément, et séparent souvent ses horaires et son temps réel en entrées distinctes. Ici, elles sont fusionnées en un flux par réseau, sans rien perdre : chaque flux renvoie à chaque entrée de catalogue dont il est issu.',
  'help.merging.sameUrl':
    'Les entrées qui indiquent la même URL, une fois normalisée, sont le même flux.',
  'help.merging.crossRef':
    'Les renvois de la Mobility Database entre des horaires et leur temps réel les réunissent.',
  'help.merging.realtime':
    'Les URL temps réel de même hôte et de même chemin qui ne diffèrent que par un dernier segment vehicles, trips ou alerts forment un seul flux.',
  'help.merging.noFuzzy':
    "Il n'y a pas de rapprochement approximatif sur les noms : deux entrées d'un même réseau avec des URL différentes et sans renvoi restent séparées. Un flux garde son identifiant d'un jour à l'autre tant que la plupart de ses entrées restent ensemble.",
  'help.merging.names':
    "Le nom est celui de l'exploitant Transitland, sinon celui du fournisseur Mobility Database (le nom de son flux devient le sous-titre), sinon celui de l'agence unique nommée par les horaires, sinon celui d'une entrée de catalogue. Tous les autres noms sont conservés, et la recherche trouve le flux par n'importe lequel.",

  'help.unplaced.label': 'Flux non situés',
  'help.unplaced.title': 'Pourquoi certains flux ne sont pas sur la carte',
  'help.unplaced.coordinates':
    "Les coordonnées viennent de la Mobility Database, qui enregistre un emplacement et une emprise pour la plupart de ses flux. Les entrées de l'Atlas Transitland n'indiquent aucun lieu : un flux présent seulement dans Transitland ne peut donc pas être dessiné.",
  'help.unplaced.merged':
    'Un flux qui fusionne une entrée Transitland avec une entrée Mobility Database prend le lieu de la Mobility Database. Les autres sont listés mais pas cartographiés, et leur nombre est toujours affiché près de la carte plutôt que passé sous silence.',

  'help.sources.label': "D'où viennent les données",
  'help.sources.title': "D'où viennent les données",
  'help.sources.lede':
    'Quatre catalogues, actualisés chaque jour par gtfs-zone-feed-catalog :',
  'help.sources.transitland': '{link} : le corpus DMFR ouvert, {license}',
  'help.sources.mobilitydatabase':
    '{link} : le catalogue de MobilityData, avec les lieux, {license}',
  'help.sources.gtfszone':
    '{link} : les flux temps réel que gtfs.zone sert lui-même, comme Amtrak',
  'help.sources.ntd':
    '{link} : les liens GTFS que les réseaux de transport américains déclarent à la FTA, domaine public',
  'help.sources.json':
    'Tout ce que montre cette page est publié en JSON sur {link} : {search} pour les flux fusionnés en bref, {feeds} pour eux en entier, {sources} pour les entrées de catalogue et {status} pour chaque vérification.',
  'help.sources.licenses':
    "Les catalogues indiquent où sont les flux ; les flux eux-mêmes appartiennent à leurs éditeurs. La page de chaque flux renvoie à la licence que son catalogue indique, et c'est cette licence, non celle de ce site, qui couvre les données.",
};
