import * as Contentstack from 'contentstack'
let Stack: null | Contentstack.Stack = null

function createClient() {
  console.log({
    api_key: process.env.CONTENTSTACK_API_KEY as string,
    delivery_token: process.env.CONTENTSTACK_ACCESS_TOKEN as string,
    environment:
      process.env.NODE_ENV ||
      process.env.VERCEL_ENV ||
      ('development' as string),
  })
  if (!Stack) {
    Stack = Contentstack.Stack({
      api_key: process.env.CONTENTSTACK_API_KEY as string,
      delivery_token: process.env.CONTENTSTACK_ACCESS_TOKEN as string,
      environment:
        process.env.NODE_ENV ||
        process.env.VERCEL_ENV ||
        ('development' as string),
    })
  }
  return Stack
}

export default {
  async getEntry(
    contentType = 'home_page',
    entryId = 'blt5c760b6ce70ae18b',
    locale = 'en-US'
  ) {
    const Stack = createClient()
    return await Stack.ContentType(contentType)
      .Entry(entryId)
      .language(locale)
      .toJSON()
      .fetch()
  },
  async getEntryWithAssets(
    contentType = 'home_page',
    entryId = 'blt5c760b6ce70ae18b',
    locale = 'en-US'
  ) {
    const { modular_blocks: blocks, ...rest } = await this.getEntry(
      contentType,
      entryId,
      locale
    )

    return {
      ...rest,
      blocks: await Promise.all(
        blocks.map(async (c: any) => {
          return {
            component: await this.includeAssets(
              c.component,
              'background_image'
            ),
          }
        })
      ),
    }
  },
  /**
   * includeAssets
   * @param entry
   * @param fieldName
   * @returns entry with image as url instead of UID
   */
  async includeAssets(
    entry: Record<string, any> = {},
    fieldName: string = 'imgUrl'
  ) {
    const Stack = createClient()
    let { [fieldName]: imgId, ...rest } = entry

    if (imgId) {
      try {
        const asset = await Stack.Assets(imgId).toJSON().fetch()

        return {
          ...rest,
          [fieldName]: asset.url,
        }
      } catch (err) {
        console.log(`Error with Asset: ${imgId} ->`, err)
        return {
          ...rest,
          [fieldName]: null,
        }
      }
    } else {
      if (rest.component_type === 'grid') {
        return {
          ...rest,
          grid: await Promise.all(
            rest.grid.map(async (c: any) => {
              return {
                item: await this.includeAssets(c.item, 'img'),
              }
            })
          ),
        }
      }
    }

    return entry
  },
}