// Demo provider rows, not real businesses. Phone numbers never live here: each row's
// phoneSlot indexes DEMO_PHONES, wrapping around, so one demo number can stand in for all.
// Booking emails for every provider go to the one teammate address in PROVIDER_EMAIL.
// listedMin/listedMax are demo listing ranges in USD for the stated listingBasis.

export const PROVIDERS_BY_SERVICE = {
  plumbing: [
    { id: 'bluewave', name: 'Bluewave Plumbing', location: 'College Park, MD', listedMin: 150, listedMax: 300, listingBasis: 'Fixed price for a typical under-sink leak repair, parts and labor', phoneSlot: 0 },
    { id: 'shellback', name: 'Shellback Repairs', location: 'Greenbelt, MD', listedMin: 175, listedMax: 350, listingBasis: 'Typical leak repair, parts and labor', phoneSlot: 1 },
    { id: 'tidepool', name: 'Tidepool Plumbing', location: 'Hyattsville, MD', listedMin: 125, listedMax: 275, listingBasis: 'Typical leak repair, parts and labor', phoneSlot: 2 },
    { id: 'kelp', name: 'Kelp Home Services', location: 'Riverdale Park, MD', listedMin: 100, listedMax: 250, listingBasis: 'Typical leak repair, parts and labor', phoneSlot: 3 },
  ],
  electrical_appliances: [
    { id: 'voltline', name: 'Voltline Appliance Repair', location: 'College Park, MD', listedMin: 120, listedMax: 280, listingBasis: 'Typical household appliance repair, parts and labor', phoneSlot: 0 },
    { id: 'brightfix', name: 'Brightfix Appliances', location: 'Greenbelt, MD', listedMin: 100, listedMax: 250, listingBasis: 'Typical household appliance repair, parts and labor', phoneSlot: 1 },
    { id: 'coilworks', name: 'Coilworks Home Electric', location: 'Hyattsville, MD', listedMin: 140, listedMax: 320, listingBasis: 'Typical household appliance repair, parts and labor', phoneSlot: 2 },
  ],
  vehicle: [
    { id: 'roadrunner', name: 'Roadrunner Auto Care', location: 'College Park, MD', listedMin: 150, listedMax: 400, listingBasis: 'Typical minor repair, parts and labor', phoneSlot: 0 },
    { id: 'gearhouse', name: 'Gearhouse Garage', location: 'Greenbelt, MD', listedMin: 120, listedMax: 350, listingBasis: 'Typical minor repair, parts and labor', phoneSlot: 1 },
    { id: 'pitstop', name: 'Pitstop Mobile Mechanics', location: 'Riverdale Park, MD', listedMin: 100, listedMax: 300, listingBasis: 'Typical minor repair, parts and labor', phoneSlot: 2 },
  ],
  carpentry: [
    { id: 'oakline', name: 'Oakline Carpentry', location: 'College Park, MD', listedMin: 90, listedMax: 250, listingBasis: 'Typical small furniture or fixture repair, parts and labor', phoneSlot: 0 },
    { id: 'grainworks', name: 'Grainworks Woodshop', location: 'Hyattsville, MD', listedMin: 110, listedMax: 300, listingBasis: 'Typical small furniture or fixture repair, parts and labor', phoneSlot: 1 },
    { id: 'dovetail', name: 'Dovetail Fixers', location: 'Greenbelt, MD', listedMin: 80, listedMax: 220, listingBasis: 'Typical small furniture or fixture repair, parts and labor', phoneSlot: 2 },
  ],
};

export const SERVICE_LABELS = {
  electrical_appliances: 'Electrical appliances',
  plumbing: 'Plumbing',
  vehicle: 'Vehicle',
  carpentry: 'Carpentry',
};

export function providersFor(serviceCategory) {
  return PROVIDERS_BY_SERVICE[serviceCategory] || [];
}

/** The providers that actually get called: the first CALL_LIMIT matches, or all when unset. */
export function providersToCall(serviceCategory) {
  const all = providersFor(serviceCategory);
  const limit = parseInt(process.env.CALL_LIMIT, 10);
  return limit > 0 ? all.slice(0, limit) : all;
}

/** Resolves a provider's demo number from DEMO_PHONES. Returns null when none is configured. */
export function demoPhoneFor(provider) {
  const phones = (process.env.DEMO_PHONES || '')
    .split(',')
    .map((p) => p.trim())
    .filter(Boolean);
  if (!phones.length) return null;
  return phones[provider.phoneSlot % phones.length];
}

/** The teammate address that stands in for every provider. Returns null when PROVIDER_EMAIL is unset. */
export function demoEmailFor() {
  return (process.env.PROVIDER_EMAIL || '').trim() || null;
}

export function findProvider(providerId) {
  return Object.values(PROVIDERS_BY_SERVICE)
    .flat()
    .find((p) => p.id === providerId);
}
