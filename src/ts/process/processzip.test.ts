import { describe, expect, it } from 'vitest'
import { zipSync } from 'fflate'
import { CharXImporter } from './processzip'

describe('CharXImporter File input', () => {
    it('reads Android-style Files without relying on File.stream()', async () => {
        const archive = zipSync({
            'card.json': new TextEncoder().encode(
                '{"spec":"chara_card_v3","data":{"name":"Amber"}}'
            )
        })

        class AndroidContentFile extends File {
            stream(): ReturnType<File['stream']> {
                throw new Error('File.stream() is unavailable for this content URI')
            }
        }

        const file = new AndroidContentFile([archive], 'Amber.charx', {
            type: 'application/zip'
        })
        const importer = new CharXImporter()

        await importer.parse(file)
        await importer.done()

        expect(JSON.parse(importer.cardData ?? '{}')).toMatchObject({
            spec: 'chara_card_v3',
            data: { name: 'Amber' }
        })
    })
})
