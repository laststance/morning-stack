/** Asia/Tokyo is the product clock for edition publication and navigation. */
export const EDITION_TIME_ZONE = "Asia/Tokyo";

/** Strict canonical edition-date syntax used in URLs and Postgres date columns. */
export const CIVIL_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

/** JavaScript Date uses zero-based month indexes while civil dates use one-based months. */
export const MONTH_INDEX_OFFSET = 1;

/** Calendar fields are padded to two digits in canonical edition URLs. */
export const CIVIL_DATE_FIELD_WIDTH = 2;

/** Morning is the default edition before noon in the product timezone. */
export const EVENING_START_HOUR = 12;
