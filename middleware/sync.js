// ✅ Mongoose plugin to sync sports, positions and sportsDetails
module.exports = function syncStudentProfilePlugin(schema) {
  schema.pre("save", function (next) {
    const doc = this;

    // Guard required arrays
    const sportsArray = Array.isArray(doc.sports) ? doc.sports.filter(Boolean) : [];

    // Normalize sports into objects with stable key and display name.
    // Supported input forms in doc.sports:
    // - "Soccer" (string)
    // - { sport: "Soccer" }
    // - { name: "Soccer" }
    // - { sportId: "abc123", sport: "Soccer" }
    // - { _id: "abc123", sport: "Soccer" }
    // - { id: "abc123", name: "Soccer" }
    const normalizeSportItem = (item) => {
      if (typeof item === "string") {
        return { key: item, sport: item, hasId: false, rawId: undefined };
      }
      if (item && typeof item === "object") {
        const rawId = item.sportId || item._id || item.id;
        const key = rawId || item.sport || item.name;
        const sport = item.sport || item.name || key;
        return { key, sport, hasId: Boolean(rawId), rawId };
      }
      const str = String(item);
      return { key: str, sport: str, hasId: false, rawId: undefined };
    };

    // De-dupe by key while preserving order (first occurrence wins)
    const seenSports = new Set();
    const normalizedSports = [];
    for (const item of sportsArray) {
      const norm = normalizeSportItem(item);
      if (!seenSports.has(norm.key)) {
        seenSports.add(norm.key);
        normalizedSports.push(norm);
      }
    }
    // Persist back to a simple array of sport names (for compatibility)
    doc.sports = normalizedSports.map((s) => s.sport);

    doc.sportsDetails = Array.isArray(doc.sportsDetails) ? doc.sportsDetails : [];
    doc.positions = Array.isArray(doc.positions) ? doc.positions : [];

    // Helper to derive stable id from sport name if no explicit id was provided
    const deriveStableIdFromName = (name) => {
      if (!name || typeof name !== "string") return undefined;
      return name
        .trim()
        .toLowerCase()
        .replace(/\s+/g, "-")
        .replace(/[^a-z0-9\-]/g, "");
    };

    // Build fast lookup maps by stable key (prefer sportId, fallback to sport name)
    const detailsByKey = new Map();
    const detailsByName = new Map(); // case-insensitive name map
    for (const details of doc.sportsDetails) {
      if (details) {
        const key = details.sportId || details.sport;
        if (key) detailsByKey.set(key, details);
        if (details.sport) detailsByName.set(String(details.sport).toLowerCase(), details);
      }
    }
    const positionsByKey = new Map();
    const positionsByName = new Map();
    for (const pos of doc.positions) {
      if (pos) {
        const key = pos.sportId || pos.sport;
        if (key) positionsByKey.set(key, pos);
        if (pos.sport) positionsByName.set(String(pos.sport).toLowerCase(), pos);
      }
    }

    // Rebuild arrays strictly from the canonical sports list to avoid duplicates
    doc.sportsDetails = normalizedSports.map(({ key, sport, hasId, rawId }) => {
      const nameKey = String(sport).toLowerCase();
      const existing = detailsByKey.get(key) || detailsByKey.get(sport) || detailsByName.get(nameKey);
      const fallbackFromName = deriveStableIdFromName(sport);
      const resolvedSportId = (existing && existing.sportId) || (hasId ? rawId : undefined) || (key !== sport ? key : fallbackFromName);
      if (existing) {
        // Preserve existing status strictly; only align ids/names
        return resolvedSportId ? { ...existing, sportId: resolvedSportId, sport } : { ...existing, sport };
      }
      const carriedStatus = detailsByName.get(nameKey)?.status;
      const status = carriedStatus || "pending";
      return resolvedSportId
        ? { sportId: resolvedSportId, sport, status }
        : { sport, status };
    });

    doc.positions = normalizedSports.map(({ key, sport, hasId, rawId }) => {
      const nameKey = String(sport).toLowerCase();
      const existing = positionsByKey.get(key) || positionsByKey.get(sport) || positionsByName.get(nameKey);
      const fallbackFromName = deriveStableIdFromName(sport);
      const resolvedSportId = (existing && existing.sportId) || (hasId ? rawId : undefined) || (key !== sport ? key : fallbackFromName);
      if (existing) {
        return resolvedSportId ? { ...existing, sportId: resolvedSportId, sport } : { ...existing, sport };
      }
      const carriedPosition = positionsByName.get(nameKey)?.position;
      const position = carriedPosition || "pending";
      return resolvedSportId
        ? { sportId: resolvedSportId, sport, position }
        : { sport, position };
    });

    next();
  });
};
