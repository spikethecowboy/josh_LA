import FeatureLayer from "@arcgis/core/layers/FeatureLayer";
import UniqueValueRenderer from "@arcgis/core/renderers/UniqueValueRenderer";
import SimpleFillSymbol from "@arcgis/core/symbols/SimpleFillSymbol";
import PictureMarkerSymbol from "@arcgis/core/symbols/PictureMarkerSymbol";
import PopupTemplate from "@arcgis/core/PopupTemplate";
import LabelClass from "@arcgis/core/layers/support/LabelClass";
import TextSymbol from "@arcgis/core/symbols/TextSymbol";

// ======================================================
// FIELD NAMES
// ======================================================
export const lotstatisticField = "OBJECTID";
export const lotStatusField = "StatusNVS3";
export const isfstatisticfield = "OBJECTID";
export const isfStatusField = "RELOCATION";
export const structurestatisticField = "OBJECTID";
export const structureStatusField = "Status";

// ======================================================
// STATUS DEFINITIONS
// Shared between each layer's renderer and its pie chart colors.
// ======================================================

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

// NOTE: code values must match RELOCATION's stored text exactly.
export const isfStatuses = [
  { code: "UNRELOCATED",    label: "Unrelocated",    color: "#ff0000" },
  { code: "RELOCATED",      label: "Relocated",      color: "#00b050" },
  { code: "SELF-RELOCATED", label: "Self-Relocated", color: "#0070ff" },
];

// NOTE: code values must match Status's stored numeric codes exactly.
// First 5 share Lot's codes/labels/colors for visual consistency across
// charts; Quit Claim (6) is specific to structures.
export const structureStatuses = [
  { code: 1, label: "Paid",                        color: "#00734d" },
  { code: 2, label: "For Payment Processing",      color: "#0070ff" },
  { code: 3, label: "For Legal Pass",              color: "#ffff00" },
  { code: 4, label: "For Appraisal/Offer to Buy",  color: "#ffaa00" },
  { code: 5, label: "For Expro",                   color: "#FF0000" },
  { code: 6, label: "Quit Claim",                  color: "#1b998b" },
];

// ======================================================
// RENDERERS
// ======================================================

// Simple person icon (head, torso, two legs), colored per status.
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
  defaultSymbol: new SimpleFillSymbol({
    style: "backward-diagonal",
    color: "#423f3fff",
    outline: { color: "#423f3fff", width: 0.5 },
  }),
  defaultLabel: "No Status",
});

// ======================================================
// POPUPS
// ======================================================

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
  title: "{NAME}",
  content: [
    {
      type: "fields",
      fieldInfos: [
        { fieldName: "NAME", label: "Name" },
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

// ======================================================
// LABELS
// ======================================================

// Static "Alignment" text, only visible past 1:50,000 zoom.
const alignmentLabelClass = new LabelClass({
  labelExpressionInfo: { expression: "'Alignment'" },
  symbol: new TextSymbol({
    color: "#ffffff",
    haloColor: "#000000",
    haloSize: 1,
    font: { size: 10, family: "sans-serif" },
  }),
  minScale: 50000,
  maxScale: 0,
});

// ======================================================
// LAYERS
// ======================================================

export const lotLayer = new FeatureLayer({
  portalItem: {
    id: "93790e8102f84713a69e562da12bb415",
    portal: { url: "https://gis.railway-sector.com/portal" },
  },
  outFields: ["StatusNVS3", "HandedOVer", "not_yet", "Package", "Type", "Station1", "OBJECTID", "OWNER", "Id"],
  layerId: 31,
  title: "MMSP Land",
  renderer: lotLayerRenderer,
  popupTemplate: lotPopupTemplate,
  listMode: "show",
});

export const alignmentLayer = new FeatureLayer({
  portalItem: {
    id: "52d4f29105934e3f95f6b39c7e5fba6e",
    portal: { url: "https://gis.railway-sector.com/portal" },
  },
  outFields: [],
  layerId: 2,
  title: "Alignment",
  opacity: 0.7,
  popupEnabled: false,
  listMode: "show",
  labelingInfo: [alignmentLabelClass],
  labelsVisible: true,
});

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

export const structureLayer = new FeatureLayer({
  portalItem: {
    id: "0c172b82ddab44f2bb439542dd75e8ae",
    portal: { url: "https://gis.railway-sector.com/portal" },
  },
  outFields: ["LOT_OWNER", "STRUCTURE_TAG_NO_", "FINAL_TOTAL_AREA", structureStatusField],
  layerId: 9,
  title: "Affected Structures",
  renderer: structureLayerRenderer,
  popupTemplate: structurePopupTemplate,
  opacity: 1,
  popupEnabled: true,
  listMode: "show",
  visible: false,
});


export const ISFLayer = new FeatureLayer({
  portalItem: {
    id: "0c172b82ddab44f2bb439542dd75e8ae",
    portal: { url: "https://gis.railway-sector.com/portal" },
  },
  outFields: [isfStatusField, "NAME", "ADDRESS", "PWD", "REMARKS"],
  layerId: 10,
  title: "ISF (Informal Settlers Families)",
  renderer: isfLayerRenderer,
  popupTemplate: isfPopupTemplate,
  opacity: 1,
  popupEnabled: true,
  listMode: "show",
  visible: false,
});