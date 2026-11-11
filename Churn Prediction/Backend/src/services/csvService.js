const { parse } = require('csv-parse/sync');
const ApiError = require('../utils/ApiError');

const ID_RE = /(^id$|customer[\s_-]?id|user[\s_-]?id|client[\s_-]?id|account[\s_-]?id|^rownumber$)/i;
const TARGET_RE = /(churn|exited|attrition)/i;

function parseCsv(buffer) {
  let records;
  try {
    records = parse(buffer, { columns: true, skip_empty_lines: true, trim: true, bom: true });
  } catch (e) {
    throw new ApiError(400, `Invalid CSV file: ${e.message}`);
  }
  if (!records.length) throw new ApiError(400, 'CSV has no data rows');
  const columns = Object.keys(records[0]);
  if (columns.length < 2) throw new ApiError(400, 'CSV must contain at least 2 columns');
  return { records, columns };
}

function profile(records, columns) {
  const cols = columns.map((name) => {
    let missing = 0;
    let numeric = 0;
    let nonEmpty = 0;
    const uniq = new Set();
    for (const r of records) {
      const v = r[name];
      if (v === '' || v === undefined || v === null) { missing++; continue; }
      nonEmpty++;
      if (uniq.size < 10000) uniq.add(v);
      if (!Number.isNaN(Number(v))) numeric++;
    }
    return { name, type: nonEmpty && numeric / nonEmpty > 0.9 ? 'numeric' : 'text', missing, unique: uniq.size };
  });
  const seen = new Set();
  let duplicateRows = 0;
  for (const r of records) {
    const key = JSON.stringify(r);
    if (seen.has(key)) duplicateRows++; else seen.add(key);
  }
  return {
    columns: cols,
    duplicateRows,
    idColumn: columns.find((c) => ID_RE.test(c)) || null,
    targetColumn: columns.find((c) => TARGET_RE.test(c)) || null,
  };
}

module.exports = { parseCsv, profile, ID_RE, TARGET_RE };
