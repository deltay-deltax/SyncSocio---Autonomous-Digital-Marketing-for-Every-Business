import { parsePhoneNumber } from 'libphonenumber-js'

console.log(parsePhoneNumber('9867123248', 'IN').formatInternational());
console.log(parsePhoneNumber('9930302041', 'IN').formatInternational());
console.log(parsePhoneNumber('+14155552671', 'IN').formatInternational());
