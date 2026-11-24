import fs from 'node:fs'
import { normalize } from '../../../../src/domain/records.ts'
import { widgetPayload } from '../../../../src/lib/widgetPayload.ts'

const [docFile, outFile, today] = process.argv.slice(2)
const doc = normalize(JSON.parse(fs.readFileSync(docFile, 'utf8')), null)
const p = JSON.parse(widgetPayload(doc))
if (today) p.today = today
fs.writeFileSync(outFile, JSON.stringify(p))
