function getSkillName(str) {
  // "Medium Edged" returns "mediumEdged"
  if (!str) {
    console.error("getSkillName called with empty string!");
    return "";
  }
  return str.substring(0, 1).toLowerCase() + str.substring(1).replace(" ", "");
}

module.exports = { getSkillName };
