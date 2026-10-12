import { TreatyPoint } from '../types';

/**
 * 1974 Historic Waters / Palk Strait Section
 * Agreement between India and Sri Lanka on the Boundary in Historic Waters
 * between the Two Countries and Related Matters (26 & 28 June 1974).
 */
export const IMBL_1974: TreatyPoint[] = [
  {
    id: '1974-pt-1',
    name: 'Point 1',
    dmsLat: "10°05′00″ N",
    dmsLng: "80°03′00″ E",
    lat: 10 + 5 / 60, // 10.083333°
    lng: 80 + 3 / 60, // 80.050000°
    section: '1974_PALK_STRAIT',
    description: 'Northern terminus of 1974 Palk Strait agreement. Connects with Bay of Bengal branch Point 1b.',
  },
  {
    id: '1974-pt-2',
    name: 'Point 2',
    dmsLat: "09°57′00″ N",
    dmsLng: "79°35′00″ E",
    lat: 9 + 57 / 60, // 9.950000°
    lng: 79 + 35 / 60, // 79.583333°
    section: '1974_PALK_STRAIT',
    description: 'Palk Strait mid-corridor treaty coordinate.',
  },
  {
    id: '1974-pt-3',
    name: 'Point 3',
    dmsLat: "09°40.15′ N",
    dmsLng: "79°22.60′ E",
    lat: 9 + 40.15 / 60, // 9.669167°
    lng: 79 + 22.60 / 60, // 79.376667°
    section: '1974_PALK_STRAIT',
    description: 'North-west of Delft Island in historic waters.',
  },
  {
    id: '1974-pt-4',
    name: 'Point 4',
    dmsLat: "09°21.80′ N",
    dmsLng: "79°30.70′ E",
    lat: 9 + 21.80 / 60, // 9.363333°
    lng: 79 + 30.70 / 60, // 79.511667°
    section: '1974_PALK_STRAIT',
    description: 'Adjacent to Kachchatheevu Island (east of island, allocating it to Sri Lankan waters).',
  },
  {
    id: '1974-pt-5',
    name: 'Point 5',
    dmsLat: "09°13′00″ N",
    dmsLng: "79°32′00″ E",
    lat: 9 + 13 / 60, // 9.216667°
    lng: 79 + 32 / 60, // 79.533333°
    section: '1974_PALK_STRAIT',
    description: 'South Palk Bay corridor towards Adam\'s Bridge.',
  },
  {
    id: '1974-pt-6',
    name: 'Point 6',
    dmsLat: "09°06′00″ N",
    dmsLng: "79°32′00″ E",
    lat: 9 + 6 / 60, // 9.100000°
    lng: 79 + 32 / 60, // 79.533333°
    section: '1974_PALK_STRAIT',
    description: "Adam's Bridge shoal pass. Connecting point to 1976 Gulf of Mannar section (Point 1m).",
  },
];

/**
 * 1976 Gulf of Mannar Section
 * Agreement between India and Sri Lanka on the Maritime Boundary in the Gulf of Mannar
 * and the Bay of Bengal and Related Matters (23 March 1976).
 */
export const IMBL_1976_GULF: TreatyPoint[] = [
  {
    id: '1976-pt-1m',
    name: 'Point 1m',
    dmsLat: "09°06.0′ N",
    dmsLng: "79°32.0′ E",
    lat: 9 + 6.0 / 60, // 9.100000°
    lng: 79 + 32.0 / 60, // 79.533333°
    section: '1976_GULF_OF_MANNAR',
    description: "Beginning of 1976 Gulf of Mannar boundary at Adam's Bridge (coincident with Point 6).",
  },
  {
    id: '1976-pt-2m',
    name: 'Point 2m',
    dmsLat: "09°00.0′ N",
    dmsLng: "79°31.3′ E",
    lat: 9 + 0.0 / 60,
    lng: 79 + 31.3 / 60,
    section: '1976_GULF_OF_MANNAR',
    description: 'Northern Gulf of Mannar great-circle arc station.',
  },
  {
    id: '1976-pt-3m',
    name: 'Point 3m',
    dmsLat: "08°53.8′ N",
    dmsLng: "79°29.3′ E",
    lat: 8 + 53.8 / 60,
    lng: 79 + 29.3 / 60,
    section: '1976_GULF_OF_MANNAR',
    description: 'Gulf of Mannar median line arc point.',
  },
  {
    id: '1976-pt-4m',
    name: 'Point 4m',
    dmsLat: "08°40.0′ N",
    dmsLng: "79°18.2′ E",
    lat: 8 + 40.0 / 60,
    lng: 79 + 18.2 / 60,
    section: '1976_GULF_OF_MANNAR',
    description: 'Gulf of Mannar mid-channel position.',
  },
  {
    id: '1976-pt-5m',
    name: 'Point 5m',
    dmsLat: "08°37.2′ N",
    dmsLng: "79°13.0′ E",
    lat: 8 + 37.2 / 60,
    lng: 79 + 13.0 / 60,
    section: '1976_GULF_OF_MANNAR',
    description: 'Gulf of Mannar continental shelf arc coordinate.',
  },
  {
    id: '1976-pt-6m',
    name: 'Point 6m',
    dmsLat: "08°31.2′ N",
    dmsLng: "79°04.7′ E",
    lat: 8 + 31.2 / 60,
    lng: 79 + 4.7 / 60,
    section: '1976_GULF_OF_MANNAR',
    description: 'Mid-gulf turning point.',
  },
  {
    id: '1976-pt-7m',
    name: 'Point 7m',
    dmsLat: "08°22.2′ N",
    dmsLng: "78°55.4′ E",
    lat: 8 + 22.2 / 60,
    lng: 78 + 55.4 / 60,
    section: '1976_GULF_OF_MANNAR',
    description: 'Gulf of Mannar maritime delimitation station.',
  },
  {
    id: '1976-pt-8m',
    name: 'Point 8m',
    dmsLat: "08°12.2′ N",
    dmsLng: "78°53.7′ E",
    lat: 8 + 12.2 / 60,
    lng: 78 + 53.7 / 60,
    section: '1976_GULF_OF_MANNAR',
    description: 'Southern Gulf of Mannar median line point.',
  },
  {
    id: '1976-pt-9m',
    name: 'Point 9m',
    dmsLat: "07°35.3′ N",
    dmsLng: "78°45.7′ E",
    lat: 7 + 35.3 / 60,
    lng: 78 + 45.7 / 60,
    section: '1976_GULF_OF_MANNAR',
    description: 'Open ocean seaward boundary station in Gulf of Mannar.',
  },
  {
    id: '1976-pt-10m',
    name: 'Point 10m',
    dmsLat: "07°21.0′ N",
    dmsLng: "78°38.8′ E",
    lat: 7 + 21.0 / 60,
    lng: 78 + 38.8 / 60,
    section: '1976_GULF_OF_MANNAR',
    description: 'Deepwater maritime boundary turning position.',
  },
  {
    id: '1976-pt-11m',
    name: 'Point 11m',
    dmsLat: "06°30.8′ N",
    dmsLng: "78°12.2′ E",
    lat: 6 + 30.8 / 60,
    lng: 78 + 12.2 / 60,
    section: '1976_GULF_OF_MANNAR',
    description: 'Southern EEZ oceanic boundary coordinate.',
  },
  {
    id: '1976-pt-12m',
    name: 'Point 12m',
    dmsLat: "05°53.9′ N",
    dmsLng: "77°50.7′ E",
    lat: 5 + 53.9 / 60,
    lng: 77 + 50.7 / 60,
    section: '1976_GULF_OF_MANNAR',
    description: 'South-western deepwater EEZ boundary arc station.',
  },
  {
    id: '1976-pt-13m',
    name: 'Point 13m',
    dmsLat: "05°00.0′ N",
    dmsLng: "77°10.6′ E",
    lat: 5 + 0.0 / 60,
    lng: 77 + 10.6 / 60,
    section: '1976_GULF_OF_MANNAR',
    description: 'Terminal point of 1976 agreement before supplementary extension to Point T.',
  },
];

/**
 * 1976 Supplementary Extension to Point T
 * Agreement between India, Sri Lanka and Maldives on the determination of the trijunction point (31 July 1976).
 */
export const IMBL_1976_T: TreatyPoint[] = [
  {
    id: '1976-pt-T',
    name: 'Point T (Trijunction)',
    dmsLat: "04°47.04′ N",
    dmsLng: "77°01.40′ E",
    lat: 4 + 47.04 / 60, // 4.784000°
    lng: 77 + 1.40 / 60, // 77.023333°
    section: '1976_POINT_T',
    description: 'Agreed India–Sri Lanka–Maldives maritime trijunction point in the Indian Ocean.',
  },
];

/**
 * 1976 Bay of Bengal Section (Article II)
 * Extends north-eastward from Point 1 / 1b into the Bay of Bengal along great circle arcs.
 */
export const IMBL_1976_BAY: TreatyPoint[] = [
  {
    id: '1976-pt-1b',
    name: 'Point 1b',
    dmsLat: "10°05.0′ N",
    dmsLng: "80°03.0′ E",
    lat: 10 + 5.0 / 60,
    lng: 80 + 3.0 / 60,
    section: '1976_BAY_OF_BENGAL',
    description: 'Northern junction connecting Palk Strait (Point 1) to the Bay of Bengal branch.',
  },
  {
    id: '1976-pt-1ba',
    name: 'Point 1ba',
    dmsLat: "10°05.8′ N",
    dmsLng: "80°05.0′ E",
    lat: 10 + 5.8 / 60,
    lng: 80 + 5.0 / 60,
    section: '1976_BAY_OF_BENGAL',
    description: 'Bay of Bengal coastal egress station.',
  },
  {
    id: '1976-pt-1bb',
    name: 'Point 1bb',
    dmsLat: "10°08.4′ N",
    dmsLng: "80°09.5′ E",
    lat: 10 + 8.4 / 60,
    lng: 80 + 9.5 / 60,
    section: '1976_BAY_OF_BENGAL',
    description: 'Point Pedro seaward boundary coordinate.',
  },
  {
    id: '1976-pt-2b',
    name: 'Point 2b',
    dmsLat: "10°33.0′ N",
    dmsLng: "80°46.0′ E",
    lat: 10 + 33.0 / 60,
    lng: 80 + 46.0 / 60,
    section: '1976_BAY_OF_BENGAL',
    description: 'Bay of Bengal shelf boundary position.',
  },
  {
    id: '1976-pt-3b',
    name: 'Point 3b',
    dmsLat: "10°41.7′ N",
    dmsLng: "81°02.5′ E",
    lat: 10 + 41.7 / 60,
    lng: 81 + 2.5 / 60,
    section: '1976_BAY_OF_BENGAL',
    description: 'Bay of Bengal continental slope coordinate.',
  },
  {
    id: '1976-pt-4b',
    name: 'Point 4b',
    dmsLat: "11°02.7′ N",
    dmsLng: "81°56.0′ E",
    lat: 11 + 2.7 / 60,
    lng: 81 + 56.0 / 60,
    section: '1976_BAY_OF_BENGAL',
    description: 'Bay of Bengal deep oceanic station.',
  },
  {
    id: '1976-pt-5b',
    name: 'Point 5b',
    dmsLat: "11°16.0′ N",
    dmsLng: "82°24.4′ E",
    lat: 11 + 16.0 / 60,
    lng: 82 + 24.4 / 60,
    section: '1976_BAY_OF_BENGAL',
    description: 'Bay of Bengal EEZ boundary arc station.',
  },
  {
    id: '1976-pt-6b',
    name: 'Point 6b',
    dmsLat: "11°26.6′ N",
    dmsLng: "83°22.0′ E",
    lat: 11 + 26.6 / 60,
    lng: 83 + 22.0 / 60,
    section: '1976_BAY_OF_BENGAL',
    description: 'Eastern terminus of 1976 Bay of Bengal boundary towards the high seas.',
  },
];

/**
 * FULL_IMBL sequence:
 * Palk Strait (1 to 6) -> Gulf of Mannar (2m to 13m) -> Point T (Trijunction).
 * (Note: 1m is identical to 6, so we don't repeat it in the contiguous sequence).
 */
export const FULL_IMBL: TreatyPoint[] = [
  ...IMBL_1974,
  ...IMBL_1976_GULF.slice(1), // omit duplicate 1m which is equal to point 6
  ...IMBL_1976_T,
];

export const ALL_TREATY_POINTS: TreatyPoint[] = [
  ...IMBL_1974,
  ...IMBL_1976_GULF,
  ...IMBL_1976_T,
  ...IMBL_1976_BAY,
];
