function uniqueValues(rows, field)
{
  return [...new Set(
    rows
      .map(function (row)
      {
        return String(row[field] || "").trim();
      })
      .filter(Boolean)
  )].sort();
}

function uniqueSplitValues(rows, field)
{
  return [...new Set(
    rows
      .flatMap(function (row)
      {
        return String(row[field] || "").split("|");
      })
      .map(function (value)
      {
        return value.trim();
      })
      .filter(Boolean)
  )].sort();
}

function findByPartNumber(rows, partNumber)
{
  const target = normalizeValue(partNumber);

  return rows.find(function (row)
  {
    return Object.keys(row).some(function (key)
    {
      const keyName = normalizeValue(key).replace(/\s+/g, "");
      const value = normalizeValue(row[key]);

      return (
        value === target &&
        (
          keyName.includes("PART") ||
          keyName.includes("CATALOG") ||
          keyName.includes("CATALOGNUMBER") ||
          keyName.includes("PARTNUMBER") ||
          keyName.includes("CATNO")
        )
      );
    });
  });
}

function normalizeValue(value)
{
  return String(value || "").trim().toUpperCase();
}

function niceLabel(key)
{
  return String(key || "")
    .replace(/_/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/\b\w/g, function (character)
    {
      return character.toUpperCase();
    });
}

function escapeHtml(value)
{
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function escapeAttribute(value)
{
  return escapeHtml(value);
}
