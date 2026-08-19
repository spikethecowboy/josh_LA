import FeatureLayer from "@arcgis/core/layers/FeatureLayer";
import GroupLayer from "@arcgis/core/layers/GroupLayer";
import UniqueValueRenderer from "@arcgis/core/renderers/UniqueValueRenderer";
import SimpleRenderer from "@arcgis/core/renderers/SimpleRenderer";
import SimpleFillSymbol from "@arcgis/core/symbols/SimpleFillSymbol";
import SimpleLineSymbol from "@arcgis/core/symbols/SimpleLineSymbol";
import PictureMarkerSymbol from "@arcgis/core/symbols/PictureMarkerSymbol";
import PopupTemplate from "@arcgis/core/PopupTemplate";
import LabelClass from "@arcgis/core/layers/support/LabelClass";
import TextSymbol from "@arcgis/core/symbols/TextSymbol";

// ============================================================
// FIELD NAMES
// ============================================================

export const lotstatisticField = "OBJECTID";
export const lotStatusField = "StatusNVS3";
export const isfstatisticfield = "OBJECTID";
export const isfStatusField = "RELOCATION";
export const structurestatisticField = "OBJECTID";
export const structureStatusField = "Status";
export const oasAffectedStructuresStatusField = "REMARKS";
export const stationBoxStatusField = "Layer";
export const demolishedStructureStatusField = "REMARKS";

// ============================================================
// STATUS DEFINITIONS
// Shared between each layer's renderer and its pie chart colors.
// ============================================================

export const lotStatuses = [
  { code: 1, label: "Paid",                        color: "#00734d" },
  { code: 2, label: "For Payment Processing",      color: "#0070ff" },
  { code: 3, label: "For Legal Pass",              color: "#ffff00" },
  { code: 4, label: "For Appraisal/Offer to Buy",  color: "#ffaa00" },
  { code: 5, label: "For Expro",                   color: "#FF0000" },
  { code: 6, label: "with WOP Fully Turned-over",  color: "#4e6b2f" },
  { code: 7, label: "ROWUA/TUA",                   color: "#70AD47" },
  { code: 8, label: "Signed ROWUA/TUA",            color: "#adc993" },
];

// code values must match RELOCATION's stored text exactly.
export const isfStatuses = [
  { code: "UNRELOCATED",    label: "Unrelocated",    color: "#ff0000" },
  { code: "RELOCATED",      label: "Relocated",      color: "#00b050" },
  { code: "SELF-RELOCATED", label: "Self-Relocated", color: "#0070ff" },
];

// First 5 mirror lotStatuses (code/label/color) for visual consistency
// across charts. Quit Claim (6) is specific to structures.
export const structureStatuses = [
  { code: 1, label: "Paid",                        color: "#00734d" },
  { code: 2, label: "For Payment Processing",      color: "#0070ff" },
  { code: 3, label: "For Legal Pass",              color: "#ffff00" },
  { code: 4, label: "For Appraisal/Offer to Buy",  color: "#ffaa00" },
  { code: 5, label: "For Expro",                   color: "#FF0000" },
  { code: 6, label: "Quit Claim",                  color: "#1b998b" },
];

// TODO: confirm these code values match REMARKS' stored text exactly
// (case-sensitive) against the live service.
export const oasAffectedStructuresStatuses = [
  { code: "Areas not yet Handed Over", label: "Areas not yet Handed Over", color: "#ffffff" },
  { code: "Handed Over Areas",         label: "Handed Over Areas",         color: "#f4c98b" },
  { code: "Demolished",                label: "Demolished",                color: "#8c8c8c" },
];

// TODO: confirm these code values match Layer's stored text exactly
// (case-sensitive) against the live service.
export const stationBoxStatuses = [
  { code: "U-Shape Retaining Wall", label: "U-Shape Retaining Wall", color: "#8c8c8c" },
  { code: "Cut & Cover Box",        label: "Cut & Cover Box",        color: "#8c8c8c" },
  { code: "TBM Shaft",              label: "TBM Shaft",              color: "#8c8c8c" },
  { code: "TBM",                    label: "TBM",                    color: "#8c8c8c" },
  { code: "Station Platform",       label: "Station Platform",       color: "#8c8c8c" },
  { code: "Station Box",            label: "Station Box",            color: "#ff0000" },
  { code: "NATM",                   label: "NATM",                   color: "#8c8c8c" },
];

// TODO: confirm these code values match REMARKS' stored text exactly
// (case-sensitive) against the live service. Colors sampled from the
// legend screenshot.
export const demolishedStructureStatuses = [
  { code: "Demolished", label: "Demolished", color: "#ffaa00" },
  { code: "Occupied",   label: "Occupied",   color: "#99a5a2" },
  { code: "others",     label: "others",     color: "#d7d79e" },
];

// ============================================================
// RENDERERS
// ============================================================

// Person icon (head, torso, two legs), colored per ISF status.
const PERSON_SHAPE =
  '<circle cx="12" cy="6" r="3"/><path d="M9,11 L15,11 L15,15 L17,22 L14,22 L12,17 L10,22 L7,22 L9,15 Z"/>';

function personIcon(color: string) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="${color}">${PERSON_SHAPE}</svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

const lotLayerRenderer = new UniqueValueRenderer({
  field: lotStatusField,
  uniqueValueInfos: lotStatuses.map(({ code, label, color }) => ({
    value: code,
    label: label,
    symbol: new SimpleFillSymbol({
      color,
      outline: { color: "#ffffff", width: 0.5 },
    }),
  })),
  defaultSymbol: new SimpleFillSymbol({
    style: "backward-diagonal",
    color: "#d9d9d9",
    outline: { color: "#d9d9d9", width: 0.5 },
  }),
  defaultLabel: "Public Land",
});

const isfLayerRenderer = new UniqueValueRenderer({
  field: isfStatusField,
  uniqueValueInfos: isfStatuses.map(({ code, label, color }) => ({
    value: code,
    label: label,
    symbol: new PictureMarkerSymbol({
      url: personIcon(color),
      width: 22,
      height: 22,
    }),
  })),
});

const structureLayerRenderer = new UniqueValueRenderer({
  field: structureStatusField,
  uniqueValueInfos: structureStatuses.map(({ code, label, color }) => ({
    value: code,
    label: label,
    symbol: new SimpleFillSymbol({
      style: "backward-diagonal",
      color,
      outline: { color: "#423f3fff", width: 0.5 },
    }),
  })),
  // Unset Status: same treatment as "others" in demolishedStructureRenderer
  // (dashed outline, no fill) so unclassified structures read consistently
  // across both layers.
  defaultSymbol: new SimpleFillSymbol({
    style: "none",
    outline: new SimpleLineSymbol({
      style: "dash",
      color: "#d7d79e",
      width: 1.5,
    }),
  }),
  defaultLabel: "No Status",
});

// Solid fill per REMARKS category — deliberately not hatched, to stay
// visually distinct from structureLayerRenderer's diagonal-hatch style.
const oasAffectedStructuresRenderer = new UniqueValueRenderer({
  field: oasAffectedStructuresStatusField,
  uniqueValueInfos: oasAffectedStructuresStatuses.map(({ code, label, color }) => ({
    value: code,
    label: label,
    symbol: new SimpleFillSymbol({
      color,
      outline: { color: "#423f3fff", width: 0.5 },
    }),
  })),
});

// Demolished/Occupied get a solid fill; "others" gets a dashed
// outline-only symbol. SimpleFillSymbol has no dashed fill style, so
// the dash lives on the outline via SimpleLineSymbol instead.
const demolishedStructureRenderer = new UniqueValueRenderer({
  field: demolishedStructureStatusField,
  uniqueValueInfos: demolishedStructureStatuses.map(({ code, label, color }) => {
    if (code === "others") {
      return {
        value: code,
        label: label,
        symbol: new SimpleFillSymbol({
          style: "none",
          outline: new SimpleLineSymbol({
            style: "dash",
            color,
            width: 1.5,
          }),
        }),
      };
    }

    return {
      value: code,
      label: label,
      symbol: new SimpleFillSymbol({
        color,
        outline: { color: "#423f3fff", width: 0.5 },
      }),
    };
  }),
});

// Handed Over / To Be Handed Over / Subterranean: single-symbol
// renderers. Each condition is a boolean/threshold, not a status enum,
// so filtering happens via definitionExpression on the layer below
// rather than via UniqueValueRenderer.
const handedOverLotRenderer = new SimpleRenderer({
  symbol: new SimpleFillSymbol({
    color: "#c22a77",
    outline: { color: "#c22a77", width: 0.5 },
  }),
});

const toBeHandedOverLotRenderer = new SimpleRenderer({
  symbol: new SimpleFillSymbol({
    color: "#6597d5",
    outline: { color: "#6597d5", width: 0.5 },
  }),
});

const subterraneanLotRenderer = new SimpleRenderer({
  symbol: new SimpleFillSymbol({
    style: "backward-diagonal",
    color: "#6cd309",
    outline: { color: "#6cd309", width: 1 },
  }),
});

// ============================================================
// POPUPS
// ============================================================

const lotPopupTemplate = new PopupTemplate({
  title: "{Package} — {Type}",
  content: [
    {
      type: "fields",
      fieldInfos: [
        { fieldName: "StatusNVS3", label: "Status" },
        { fieldName: "Package", label: "Package" },
        { fieldName: "Type", label: "Type" },
        { fieldName: "Station1", label: "Station" },
      ],
    },
  ],
});

const isfPopupTemplate = new PopupTemplate({
  title: "{NAME_HH}",
  content: [
    {
      type: "fields",
      fieldInfos: [
        { fieldName: "NAME_HH", label: "Name" },
        { fieldName: "ADDRESS", label: "Address" },
        { fieldName: "PWD", label: "PWD" },
        { fieldName: "REMARKS", label: "Remarks" },
      ],
    },
  ],
});

const structurePopupTemplate = new PopupTemplate({
  title: "{STRUCTURE_TAG_NO_}",
  content: [
    {
      type: "fields",
      fieldInfos: [
        { fieldName: "Status", label: "Status" },
        { fieldName: "LOT_OWNER", label: "Lot Owner" },
        { fieldName: "STRUCTURE_TAG_NO_", label: "Structure Tag No." },
        { fieldName: "FINAL_TOTAL_AREA", label: "Final Total Area" },
      ],
    },
  ],
});

// ============================================================
// LABELS
// ============================================================

// Static "Station Box" text, visible only past 1:50,000 zoom.
const stationBoxLabelClass = new LabelClass({
  labelExpressionInfo: { expression: "'Station Box'" },
  symbol: new TextSymbol({
    color: "#ffffff",
    haloColor: "#000000",
    haloSize: 1,
    font: { size: 10, family: "sans-serif" },
  }),
  minScale: 50000,
  maxScale: 0,
});

// ============================================================
// LAYERS — Land
// (1st added in MapDisplay: landGroupLayer)
// ============================================================

export const lotLayer = new FeatureLayer({
  portalItem: {
    id: "93790e8102f84713a69e562da12bb415",
    portal: { url: "https://gis.railway-sector.com/portal" },
  },
  outFields: ["StatusNVS3", "HandedOVer", "not_yet", "Package", "Type", "Station1", "OBJECTID", "OWNER", "Id", "Issue"],
  layerId: 31,
  title: "MMSP Land",
  renderer: lotLayerRenderer,
  popupTemplate: lotPopupTemplate,
  listMode: "show",
});

// HandedOVer = 1
export const handedOverLotsLayer = new FeatureLayer({
  portalItem: {
    id: "93790e8102f84713a69e562da12bb415",
    portal: { url: "https://gis.railway-sector.com/portal" },
  },
  outFields: ["HandedOVer"],
  layerId: 31,
  title: "Handed Over (GC to JV)",
  opacity: 0.9,
  renderer: handedOverLotRenderer,
  definitionExpression: "HandedOVer = 1",
  popupEnabled: false,
  listMode: "show",
  visible: false,
});

// not_yet = 1
export const toBeHandedOverLotsLayer = new FeatureLayer({
  portalItem: {
    id: "93790e8102f84713a69e562da12bb415",
    portal: { url: "https://gis.railway-sector.com/portal" },
  },
  outFields: ["not_yet"],
  layerId: 31,
  title: "To Be Handed Over (to JV)",
  opacity: 0.7,
  renderer: toBeHandedOverLotRenderer,
  definitionExpression: "not_yet = 1",
  popupEnabled: false,
  listMode: "show",
  visible: false,
});

// Tunnel_Depth > 18
export const subterraneanLotsLayer = new FeatureLayer({
  portalItem: {
    id: "93790e8102f84713a69e562da12bb415",
    portal: { url: "https://gis.railway-sector.com/portal" },
  },
  outFields: ["Tunnel_Depth"],
  layerId: 31,
  title: "Subterranean Lots",
  opacity: 0.7,
  renderer: subterraneanLotRenderer,
  definitionExpression: "Tunnel_Depth > 18",
  popupEnabled: false,
  listMode: "show",
  visible: false,
});

export const landGroupLayer = new GroupLayer({
  title: "Land",
  visibilityMode: "independent",
  layers: [lotLayer, handedOverLotsLayer, toBeHandedOverLotsLayer, subterraneanLotsLayer],
  visible: true,
  listMode: "show",
});

// ============================================================
// LAYERS — Structures
// (2nd added in MapDisplay: structuresGroupLayer)
// ============================================================

export const existingStructureLayer = new FeatureLayer({
  portalItem: {
    id: "0c172b82ddab44f2bb439542dd75e8ae",
    portal: { url: "https://gis.railway-sector.com/portal" },
  },
  outFields: ["LOT_OWNER", "STRUCTURE_TAG_NO_", "FINAL_TOTAL_AREA", structureStatusField],
  layerId: 9,
  title: "Existing Structure",
  renderer: structureLayerRenderer,
  popupTemplate: structurePopupTemplate,
  opacity: 1,
  popupEnabled: true,
  listMode: "show",
  visible: true,
});

// Same source layer (9) as existingStructureLayer, symbolized by REMARKS
// instead of Status — not a filtered subset. Both show the same features
// through two different lenses.
export const demolishedStructureLayer = new FeatureLayer({
  portalItem: {
    id: "0c172b82ddab44f2bb439542dd75e8ae",
    portal: { url: "https://gis.railway-sector.com/portal" },
  },
  outFields: ["LOT_OWNER", "STRUCTURE_TAG_NO_", "FINAL_TOTAL_AREA", structureStatusField, demolishedStructureStatusField],
  layerId: 9,
  title: "Demolished Structure",
  renderer: demolishedStructureRenderer,
  popupTemplate: structurePopupTemplate,
  opacity: 1,
  popupEnabled: true,
  listMode: "show",
  visible: true,
});

export const structuresGroupLayer = new GroupLayer({
  title: "Structures",
  visibilityMode: "independent",
  layers: [existingStructureLayer, demolishedStructureLayer],
  visible: false,
  listMode: "show",
});

// ============================================================
// LAYERS — ISF
// (3rd added in MapDisplay: isfLayer)
// ============================================================

export const isfLayer = new FeatureLayer({
  portalItem: {
    id: "0c172b82ddab44f2bb439542dd75e8ae",
    portal: { url: "https://gis.railway-sector.com/portal" },
  },
  outFields: [isfStatusField, "NAME_HH", "ADDRESS", "PWD", "REMARKS"],
  layerId: 10,
  title: "ISF (Informal Settlers Families)",
  renderer: isfLayerRenderer,
  popupTemplate: isfPopupTemplate,
  opacity: 1,
  popupEnabled: true,
  listMode: "show",
  visible: false,
});

// ============================================================
// LAYERS — Boundary
// (4th added in MapDisplay: boundaryGroupLayer)
// ============================================================

export const constructionBoundaryLayer = new FeatureLayer({
  portalItem: {
    id: "0c172b82ddab44f2bb439542dd75e8ae",
    portal: { url: "https://gis.railway-sector.com/portal" },
  },
  outFields: [],
  layerId: 4,
  title: "Construction Boundary",
  opacity: 1,
  popupEnabled: false,
  listMode: "show",
  visible: true,
});

export const stationBoxLayer = new FeatureLayer({
  portalItem: {
    id: "52d4f29105934e3f95f6b39c7e5fba6e",
    portal: { url: "https://gis.railway-sector.com/portal" },
  },
  outFields: [],
  layerId: 2,
  title: "Station Box",
  opacity: 0.7,
  popupEnabled: false,
  listMode: "show",
  labelingInfo: [stationBoxLabelClass],
  labelsVisible: true,
});

export const boundaryGroupLayer = new GroupLayer({
  title: "Boundary",
  visibilityMode: "independent",
  layers: [constructionBoundaryLayer, stationBoxLayer],
  visible: true,
  listMode: "show",
});

// ============================================================
// LAYERS — Depot Buildings
// (5th added in MapDisplay: depotBuildingsGroupLayer)
// ============================================================

export const bssBuildingLayer = new FeatureLayer({
  portalItem: {
    id: "0c172b82ddab44f2bb439542dd75e8ae",
    portal: { url: "https://gis.railway-sector.com/portal" },
  },
  outFields: [],
  layerId: 7,
  title: "BSS Building",
  opacity: 1,
  popupEnabled: false,
  listMode: "show",
  visible: true,
});

export const depotBuildingLayer = new FeatureLayer({
  portalItem: {
    id: "0c172b82ddab44f2bb439542dd75e8ae",
    portal: { url: "https://gis.railway-sector.com/portal" },
  },
  outFields: [],
  layerId: 6,
  title: "Depot Building",
  opacity: 1,
  popupEnabled: false,
  listMode: "show",
  visible: true,
});

export const dpwhSegmentLayer = new FeatureLayer({
  portalItem: {
    id: "0c172b82ddab44f2bb439542dd75e8ae",
    portal: { url: "https://gis.railway-sector.com/portal" },
  },
  outFields: [],
  layerId: 2,
  title: "DPWH Segment",
  opacity: 1,
  popupEnabled: false,
  listMode: "show",
  visible: true,
});

export const depotBuildingsGroupLayer = new GroupLayer({
  title: "Depot Buildings",
  visibilityMode: "independent",
  layers: [dpwhSegmentLayer, bssBuildingLayer, depotBuildingLayer],
  visible: true,
  listMode: "show",
});

// ============================================================
// LAYERS — Senate-DepEd Station
// (6th added in MapDisplay: senateDepEdStationGroupLayer)
// ============================================================

export const senateOldConstructionBoundaryLayer = new FeatureLayer({
  portalItem: {
    id: "791f47c19d054cf88dd85fa5a4b4c991",
    portal: { url: "https://gis.railway-sector.com/portal" },
  },
  outFields: [],
  layerId: 24,
  title: "Senate Old Construction Boundary",
  opacity: 1,
  popupEnabled: false,
  listMode: "show",
  visible: true,
});

export const senateOldStationBoxLayer = new FeatureLayer({
  portalItem: {
    id: "791f47c19d054cf88dd85fa5a4b4c991",
    portal: { url: "https://gis.railway-sector.com/portal" },
  },
  outFields: [],
  layerId: 25,
  title: "Senate Old Station Box",
  opacity: 1,
  popupEnabled: false,
  listMode: "show",
  visible: true,
});

export const nccPropertyLayer = new FeatureLayer({
  portalItem: {
    id: "0c172b82ddab44f2bb439542dd75e8ae",
    portal: { url: "https://gis.railway-sector.com/portal" },
  },
  outFields: [],
  layerId: 5,
  title: "NCC Property",
  opacity: 1,
  popupEnabled: false,
  listMode: "show",
  visible: true,
});

export const senateDepEdStationGroupLayer = new GroupLayer({
  title: "Senate-DepEd Station",
  visibilityMode: "independent",
  layers: [senateOldConstructionBoundaryLayer, senateOldStationBoxLayer, nccPropertyLayer],
  visible: true,
  listMode: "show",
});

// ============================================================
// LAYERS — Ortigas Station
// (7th added in MapDisplay: ortigasStationGroupLayer)
// ============================================================

export const oasAccessRoadLayer = new FeatureLayer({
  portalItem: {
    id: "437ae464f49544e080c9dda8f98a169d",
    portal: { url: "https://gis.railway-sector.com/portal" },
  },
  outFields: [],
  layerId: 29,
  title: "OAS Access Roads",
  opacity: 1,
  popupEnabled: false,
  listMode: "show",
  visible: true,
});

export const oasAffectedStructuresLayer = new FeatureLayer({
  portalItem: {
    id: "437ae464f49544e080c9dda8f98a169d",
    portal: { url: "https://gis.railway-sector.com/portal" },
  },
  outFields: [oasAffectedStructuresStatusField],
  layerId: 28,
  title: "OAS Affected Structures",
  renderer: oasAffectedStructuresRenderer,
  opacity: 1,
  popupEnabled: false,
  listMode: "show",
  visible: true,
});

export const ortigasStationGroupLayer = new GroupLayer({
  title: "Ortigas Station",
  visibilityMode: "independent",
  layers: [oasAffectedStructuresLayer, oasAccessRoadLayer],
  visible: true,
  listMode: "show",
});

// ============================================================
// LAYERS — East Valenzuela Station
// (8th added in MapDisplay: eastValenzualaStationGroupLayer)
// ============================================================

export const creekDiversionLayer = new FeatureLayer({
  portalItem: {
    id: "52d4f29105934e3f95f6b39c7e5fba6e",
    portal: { url: "https://gis.railway-sector.com/portal" },
  },
  outFields: [],
  layerId: 3,
  title: "Creek Diversion",
  opacity: 1,
  popupEnabled: false,
  listMode: "show",
  visible: true,
});

export const eastValenzualaStationLayer = new FeatureLayer({
  portalItem: {
    id: "0c172b82ddab44f2bb439542dd75e8ae",
    portal: { url: "https://gis.railway-sector.com/portal" },
  },
  outFields: [],
  layerId: 1,
  title: "East Valenzuala Station",
  opacity: 1,
  popupEnabled: false,
  listMode: "show",
  visible: true,
});

export const eastValenzualaStationGroupLayer = new GroupLayer({
  title: "East Valenzuala Station",
  visibilityMode: "independent",
  layers: [creekDiversionLayer, eastValenzualaStationLayer],
  visible: true,
  listMode: "show",
});

// ============================================================
// LAYERS — Alignment
// (9th added in MapDisplay: alignmentLayer)
// ============================================================

export const alignmentLayer = new FeatureLayer({
  portalItem: {
    id: "52d4f29105934e3f95f6b39c7e5fba6e",
    portal: { url: "https://gis.railway-sector.com/portal" },
  },
  outFields: [],
  layerId: 6,
  title: "Alignment",
  opacity: 1,
  popupEnabled: false,
  listMode: "show",
  visible: true,
});

// ============================================================
// LAYERS — Stations
// (10th added in MapDisplay: stationLayer)
// ============================================================

export const stationLayer = new FeatureLayer({
  portalItem: {
    id: "52d4f29105934e3f95f6b39c7e5fba6e",
    portal: { url: "https://gis.railway-sector.com/portal" },
  },
  outFields: [],
  layerId: 1,
  title: "Stations",
  opacity: 1,
  popupEnabled: false,
  listMode: "hide",
});