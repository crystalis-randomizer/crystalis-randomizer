
export class Sprite {
  readonly name: string;
  readonly converter: Map<number, number[]>;
  readonly image: string;
  readonly chr_data: number[];
  readonly description?: string;
  constructor(name: string, converter: Map<number, number[]>, image: string, chr_data: number[], description?: string) {
    this.name = name;
    this.converter = converter;
    this.image = image;
    this.chr_data = chr_data;
    this.description = description;
  }

  public applyPatch(rom: Uint8Array) {
    if (this.chr_data.length == 0) {
      return;
    }
    for (let [src, dsts] of this.converter) {
      for (let dst of dsts) {
        for (let i=0; i<0x10; ++i) {
          rom[dst + i] = this.chr_data[src * 0x10 + i];
        }
      }
    }
  }
}

export class CharacterSet {
  private static instance: CharacterSet;
  private readonly semiaReplacements = new Array<Sprite>();

  static semia(): Sprite[] {
    if (!this.instance) this.instance = new CharacterSet();
    return [...this.instance.semiaReplacements];
  }

  constructor() {
    this.semiaReplacements.push(new Sprite("Semia", CustomTilesetMapping.semia(), "images/semia.png", [], "The original main character of Crystalis"));
    this.semiaReplacements.push(new Sprite("Mesia", CustomTilesetMapping.semia(), "images/mesia.png", mesia_patch_data, "Secondary protagonist Mesia takes the spotlight! Artwork by jroweboy"));
  }
}

function toAddr(chr_page: number, nametable: number, tile_number: number): number {
  const baseAddr = 0x40000 + 0x10; // added 0x10 to account for rom header
  return baseAddr + chr_page * 0x2000 + nametable * 0x1000 + tile_number * 0x10;
}

// Provides a lookup from the sample tileset to the CHRROM locations
class CustomTilesetMapping {
  private static instance: CustomTilesetMapping;
  private readonly semiaMapping: Map<number, number[]>;

  static semia() : Map<number, number[]> {
    if (!this.instance) this.instance = new CustomTilesetMapping();
    return this.instance.semiaMapping;
  }

  constructor() {
    this.semiaMapping = this.generateSemiaMapping();
  }

  private generateSemiaMapping() : Map<number, number[]> {
    // For most of the mappings, there is only one location to write it to, but for some, its split across several CHRROM banks.
    // so thats why its a map of tileset number to a list of addresses

    // A CHR tileset is 16 tiles wide, the left 8 tiles are the no armor sprites, the right 8 are the armor sprites
    const ARMOR_TILESET_OFFSET = 0x08;
    // In the original game, the game swaps the two 0x20 size CHR banks for sprites to switch armor/no armor sprites
    const CHR_PAGE_OFFSET = 0x400;

    const mapping = new Map<number, number[]>();
    //////////
    // Walking Down
    // top left
    mapping.set(0x00, [toAddr(8,0,0x1a)]);
    // top right
    mapping.set(0x01, [toAddr(8,0,0x1b)]);
    // mid left
    mapping.set(0x10, [toAddr(8,0,0x00)]);
    // mid right
    mapping.set(0x11, [toAddr(8,0,0x01)]);
    // bot left
    mapping.set(0x20, [toAddr(8,0,0x20)]);
    // bot right
    mapping.set(0x21, [toAddr(8,0,0x21)]);

    //////////
    // Walking Left
    // top left
    mapping.set(0x02, [toAddr(8,0,0x1c)]);
    // top right
    mapping.set(0x03, [toAddr(8,0,0x1d)]);
    // mid left
    mapping.set(0x12, [toAddr(8,0,0x02)]);
    // mid right
    mapping.set(0x13, [toAddr(8,0,0x03)]);
    // mid arm left
    mapping.set(0x14, [toAddr(8,0,0x04)]);
    // mid arm right
    mapping.set(0x15, [toAddr(8,0,0x05)]);
    // bot left
    mapping.set(0x22, [toAddr(8,0,0x22)]);
    // bot right
    mapping.set(0x23, [toAddr(8,0,0x23)]);
    // bot leg left
    mapping.set(0x24, [toAddr(8,0,0x24)]);
    // bot leg right
    mapping.set(0x25, [toAddr(8,0,0x25)]);

    //////////
    // Walking Up
    // Up top left
    mapping.set(0x06, [toAddr(8,0,0x1e)]);
    // Up top right
    mapping.set(0x07, [toAddr(8,0,0x1f)]);
    // Up mid left
    mapping.set(0x16, [toAddr(8,0,0x06)]);
    // Up mid right
    mapping.set(0x17, [toAddr(8,0,0x07)]);
    // Up bot left
    mapping.set(0x26, [toAddr(8,0,0x26)]);
    // Up bot right
    mapping.set(0x27, [toAddr(8,0,0x27)]);
    
    //////////
    // Up attack
    // Frame 1
    // mid left
    mapping.set(0x40, [toAddr(8,0,0x14)]);
    // mid right
    mapping.set(0x41, [toAddr(8,0,0x15)]);
    // bot left
    mapping.set(0x50, [toAddr(8,0,0x34)]);
    // bot right
    mapping.set(0x51, [toAddr(8,0,0x35)]);

    // Frame 2
    // top left
    mapping.set(0x32, [toAddr(8,0,0x3c)]);
    // top right
    mapping.set(0x33, [toAddr(8,0,0x3d)]);
    // mid left
    mapping.set(0x42, [toAddr(8,0,0x18)]);
    // mid right
    mapping.set(0x43, [toAddr(8,0,0x19)]);
    // bot left
    mapping.set(0x52, [toAddr(8,0,0x38)]);
    // bot right
    mapping.set(0x53, [toAddr(8,0,0x27)]);

    // Frame 3
    // mid left
    mapping.set(0x44, [toAddr(8,0,0x16)]);
    // mid right
    mapping.set(0x45, [toAddr(8,0,0x17)]);
    // bot left
    mapping.set(0x54, [toAddr(8,0,0x36)]);

    ////////
    // Left attack
    // Frame 1
    // mid left
    mapping.set(0x70, [toAddr(8,0,0x0e)]);
    // mid right
    mapping.set(0x71, [toAddr(8,0,0x0f)]);
    // bot left
    mapping.set(0x80, [toAddr(8,0,0x2e)]);
    // bot right
    mapping.set(0x81, [toAddr(8,0,0x2f)]);

    // Frame 2
    // mid left
    mapping.set(0x72, [toAddr(8,0,0x12)]);
    // mid right
    mapping.set(0x73, [toAddr(8,0,0x13)]);
    // bot left
    mapping.set(0x82, [toAddr(8,0,0x30)]);
    // bot right
    mapping.set(0x83, [toAddr(8,0,0x33)]);

    // Frame 3
    // mid left
    mapping.set(0x74, [toAddr(8,0,0x10)]);
    // mid right
    mapping.set(0x75, [toAddr(8,0,0x11)]);
    // bot right
    mapping.set(0x85, [toAddr(8,0,0x31)]);

    //////////
    // Down attack
    // Frame 1
    // mid left
    mapping.set(0xa0, [toAddr(8,0,0x08)]);
    // mid right
    mapping.set(0xa1, [toAddr(8,0,0x09)]);
    // bot left
    mapping.set(0xb0, [toAddr(8,0,0x28)]);

    // Frame 2
    // top left
    mapping.set(0x92, [toAddr(8,0,0x3a)]);
    // top right
    mapping.set(0x93, [toAddr(8,0,0x3b)]);
    // mid left
    mapping.set(0xa2, [toAddr(8,0,0x0c)]);
    // mid right
    mapping.set(0xa3, [toAddr(8,0,0x0d)]);
    // bot left
    mapping.set(0xb2, [toAddr(8,0,0x2c)]);
    // bot right
    mapping.set(0xb3, [toAddr(8,0,0x2d)]);

    // Frame 3
    // mid left
    mapping.set(0xa4, [toAddr(8,0,0x0a)]);
    // mid right
    mapping.set(0xa5, [toAddr(8,0,0x0b)]);
    // bot right
    mapping.set(0xb5, [toAddr(8,0,0x2b)]);

    // Armor mappings
    // Create the armor mappings by using the hardcoded sprite mappings but with the armor offsets
    const noarmor_mappings = new Map(mapping);
    for (let [key, value] of noarmor_mappings) {
      const armor_key = key + ARMOR_TILESET_OFFSET;
      const armor_val = value.map((k) => k + CHR_PAGE_OFFSET);
      mapping.set(armor_key, armor_val);
    }

    /////////
    // The following no armor animations have an armor counterpart, but its unused in the original game.
    // The sprite sheet is arranged so that if we fix it so armor shows in these scenes (death, holding sword, telepathy)
    // Then we can reuse the armor mapping code above.

    // Death
    // Frame 1
    // top left
    mapping.set(0xc0, [toAddr(11,1,0x00)]);
    // top right
    mapping.set(0xc1, [toAddr(11,1,0x01)]);
    // mid left
    mapping.set(0xd0, [toAddr(11,1,0x02)]);
    // mid right
    mapping.set(0xd1, [toAddr(11,1,0x03)]);
    // bot left
    mapping.set(0xe0, [toAddr(11,1,0x04)]);
    // bot right
    mapping.set(0xe1, [toAddr(11,1,0x05)]);

    // Frame 2
    // top left
    mapping.set(0xc2, [toAddr(11,1,0x24)]);
    // top right
    mapping.set(0xc3, [toAddr(11,1,0x25)]);
    // mid left
    mapping.set(0xd2, [toAddr(11,1,0x06)]);
    // mid right
    mapping.set(0xd3, [toAddr(11,1,0x07)]);
    // bot left
    mapping.set(0xe2, [toAddr(11,1,0x26)]);
    // bot right
    mapping.set(0xe3, [toAddr(11,1,0x27)]);

    // Frame 3
    // top left
    mapping.set(0xc4, [toAddr(11,1,0x20)]);
    // top right
    mapping.set(0xc5, [toAddr(11,1,0x21)]);
    // mid left
    mapping.set(0xd4, [toAddr(11,1,0x22)]);
    // mid right
    mapping.set(0xd5, [toAddr(11,1,0x23)]);

    // Frame 4
    // mid left
    mapping.set(0xd6, [toAddr(11,1,0x14)]);
    // mid right
    mapping.set(0xd7, [toAddr(11,1,0x15)]);
    // bot left
    mapping.set(0xe6, [toAddr(11,1,0x16)]);
    // bot right
    mapping.set(0xe7, [toAddr(11,1,0x17)]);

    // Holding sword
    // top left
    mapping.set(0x36, [toAddr(11,1,0x0c)]);
    // top right
    mapping.set(0x37, [toAddr(11,1,0x0d)]);
    // mid left
    mapping.set(0x46, [toAddr(11,1,0x32)]);
    // mid right
    mapping.set(0x47, [toAddr(11,1,0x33)]);
    // bot left
    mapping.set(0x56, [toAddr(11,1,0x2e)]);
    // bot right
    mapping.set(0x57, [toAddr(11,1,0x2f)]);

    // Telepathy
    // Frame 1
    // top left
    mapping.set(0x66, [toAddr(11,1,0x24)]);
    // top right
    mapping.set(0x67, [toAddr(11,1,0x25)]);
    // mid left
    mapping.set(0x76, [toAddr(11,1,0x06)]);
    // mid right
    mapping.set(0x77, [toAddr(11,1,0x07)]);
    // bot left
    mapping.set(0x86, [toAddr(11,1,0x26)]);
    // bot right
    mapping.set(0x87, [toAddr(11,1,0x27)]);

    // Frame 2
    // mid left
    mapping.set(0xa6, [toAddr(11,1,0x06)]);
    // mid right
    mapping.set(0xa7, [toAddr(11,1,0x07)]);
    // bot left
    mapping.set(0xb6, [toAddr(11,1,0x26)]);
    // bot right
    mapping.set(0xb7, [toAddr(11,1,0x27)]);


    //////////
    // Misc
    // Each sword has their own page of sprites, so apply the change to all pages.
    let copyToAllWeaponPages = (tile: number) => {
      return [
        toAddr(8, 0, tile) + CHR_PAGE_OFFSET * 2,
        toAddr(8, 0, tile) + CHR_PAGE_OFFSET * 3,
        toAddr(8, 1, tile),
        toAddr(8, 1, tile) + CHR_PAGE_OFFSET,
        toAddr(8, 1, tile) + CHR_PAGE_OFFSET * 2,
      ]
    }
    // Swords
    // diagonal left top
    mapping.set(0xf0, copyToAllWeaponPages(0x10));
    // diagonal left bot
    mapping.set(0xf1, copyToAllWeaponPages(0x11));
    // down top
    mapping.set(0xf2, copyToAllWeaponPages(0x12));
    // down bot
    mapping.set(0xf3, copyToAllWeaponPages(0x13));
    // left left
    mapping.set(0xf4, copyToAllWeaponPages(0x14));
    // left right
    mapping.set(0xf5, copyToAllWeaponPages(0x15));
    // TODO: ???
    mapping.set(0xf6, copyToAllWeaponPages(0x16));
    // ???
    mapping.set(0xf7, copyToAllWeaponPages(0x17));
    // Hilt - is only in the page with mesia since its only used in the tower
    mapping.set(0xf8, [toAddr(8, 1, 0xed)]);
    // full length blade
    mapping.set(0xf9, copyToAllWeaponPages(0x19));
    // diagonal right
    mapping.set(0xfa, copyToAllWeaponPages(0x1a));

    // Shields
    // Down
    mapping.set(0xfc, copyToAllWeaponPages(0x30));
    // Left
    mapping.set(0xfd, copyToAllWeaponPages(0x31));
    // Up top
    mapping.set(0xfe, copyToAllWeaponPages(0x32));
    // Up bot
    mapping.set(0xff, copyToAllWeaponPages(0x33));

    return mapping;
  }
}


const mesia_spritesheet_chr = "BwgRFhkRFxcHDx4fHg4KGuAQiGiYiOjo4PB4+HhwUFgHCDxDREw/DwcPM397ezoK4BAICIhIuLjg8Pj4+PjIyAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABwgQEBgWERAHDx8fHw0OH+AQCAgYaIgI4PD4+PiwcPgHCBEWGREXFwcPHh8eDgoa4BCIaJiI6Ojg8Hj4eHBQWAcIPENETD8PBw8zf3t7OgrgEAgIiEi4uODw+Pj4+MjIAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAHCBAQGBYREAcPHx8fDQ4f4BAICBhoiAjg8Pj4+LBw+BcnIytaW34+GDw/Nmd+Zyfw6MjEfPx8NBA4+HzsdOT8DwcDAwIDAgQIBAMCAwIDB4SCkpGJhUYk/P7+/////vwAAAwcPHx4MAAACBAgVEgwABAYHBweHgwAEAgEBBoSDBAQECA5OXl4Hx8fPy8/T08ISEhERCIipPj4+Pz8/v78FycrOV5dfD0YPD8/fX5nJ/Do2Jx8vDycEDj4/Kx05PwPBwMCAwICBAgEAwMCAwMHhJJK6eWnskz8/v7////+/AAACBw8eHAwAAAIHDxYQDAAABA4PB4eDAAAEDg8GhIMEBAQMDk5eXgfHx8/Pz9PTwhISEREIiKk+Pj4/Pz+/vw0DwcECAkGAD8PBAcPDwYAGPDw8JCQiMj48JCQ8PD4+AQDAQEBAgQDBwMBAQEDBwMQ4OAgEBAgwPDgIODw8ODABAcHOUEiEgwHBwQ/fz4eDBjw+PQiEiQY+PB4zD4ePBg0DwcECAkGAD8PBAcPDwYAFPjw8JCQiEj8+JCQ8PD4eD8PBwQICQYAPw8EBw8PBgD48PDwkJCIyPjwkJDw8Pj4BwMBAQECBAMHAwEBAQMHA/Dg4CAQECDA8OAg4PDw4MAHBwc5QSISDAcHBD9/Ph4M+PD49CISJBj48HjMPh48GDQPBwQICQYAPw8EBw8PBgAU+PDwkJCISPz4kJDw8Ph4AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAwQIEBgWEQADBw8fDw0eAMAgEAgYaIgAwODw+PCweAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABwgRFhkR9/cHDx4fHg4qOuAQiGiYiOjo4PB4+HhwUFgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAADBAgQGBYRAAMHDx8PDR4AwCAQCBhoiADA4PD48LB4AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAEBAgZUlJAAAfHz8/f38AAISIiAxePwAA/Pj49OblEBAQCRkkPDwfHx8PHz8/JwhISCQkopKU+Pj4/Pz+/vwAAAAQEHLh4QAAAB8ff7+/AAAACExMKCQAAAD49PT4/P//dyMSCwoO2IxPPh8ODw/49NTKTd9efhg8/H73d/ryAAAQECBlSUkAAB8fPz9/fwAAhIiIHF4/AAD8+Pj8/v0QEBAJGTw8PB8fHw8fPz8nCEhIJCSikpT4+Pj8/P7+/AAAABAQcuHhAAAAHx9/v78AAAAITEwoJAAAAPj8/Pj8AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABIPgcECA8AAH8/BAcPDwAAHz/ekPCQiIT58f7wkPD4/D4fBwQJBwAAJx8EBw8HAAAU+PDwkJCISPz4kJDw8Ph4GAcHBAgHAQAfBwQHDwcBAAAAAAAAAAAAAAAAAAAAAAAYDw8PCRERDh8PCQkPHx8OGPDw8JCIiHD48JCQ8Pj4cEg+BwQIDwAAfz8EBw8PAAAfP/7w8JCIhPnx/vCQ8Pj8Ph8HBAkHAAAnHwQHDwcAABT48PCQkIhI/PiQkPDw+HgYBwcECAcBAB8HBAcPBwEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAwwQEBkAAAADDx8PDgAAAMCwCAiYAAAAwPD48HAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAHAwEDAAAAAAQCAQMAAAAA5MLSkgAAAAA8fv5+AAA/f//ydwwAACFznp9sDwAAYJic/p+PAADg+OTm+fkAAAAPBwMBAQAAAAgEAwEBAAAAyKgUHKgAAAB4+Pz82BYRLy8vIzknHx44Pjg8Pz5ohPT09MqqxPh8HHwcPv58AAAAAAcDAQMAAAAABAIBAwAAAADk4vLSAAAAADx+/v4AAD9///RyDwAAIXOfm30PABDY5LK+X48AMPj8/v75+QAAAA8HAwEBAAAACAQDAQEAAADI6PR8aAAAAHj4/Pz4AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAHBwMPEQgEAwQEAw8eDwcD4dEerPpyZPi///58Zv78+AEBAgMHCBAPAQEDAgYPHw/2MChY4GBIsPbw+Oh4+PiwAAAAAAAAAAAAAAAAAAAAAPh4ePz6cmSY+MjIfGb+/JgnHxg/cXA4HzoRHydfXy8f5PgY/L5eXPhciPjkwuLs+AcHAw8RCAQDBAQDDx4PBwPRmf78+nJk+P///nxm/vz4AQEDAwcIEA8BAQMCBg8fDzbw+PjgYEiw9vD46Hj4+LAAAAAAAAAAAAAAAAAAAAAA+Hj4/PpyZJj4yMh8Zv78mAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAADDBgYOCcyPwMPHxc/PD8swDAYGBzkSvrA8Pjo/Dz+NgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAMMGBg4JzI/Aw8fFz88PyzAMBgYHORK+sDw+Oj8PP42AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAC/Hw/PKDwgIOPx/Ps8MDw/4+PTSWr68PBg4/H728uzkAAAAPx8nJx8AAAAqGjw7EQAAAPr68vTYAAAAVl4+/DgPFyNDZvv6fAgcP35fjr9P9Orm9D7+D/8cPv488jb5+RYRLy8nIzMiHx44Pjg9Pj9ohPT09MrKRPh8HHwcvn78P+/n88oLCA84/H8/zQwPD/jozJ6+fny8GDj8/nby7OQAAAA/HycnHwAAACoaPDsRAAAA+vr67KgAAABWXj782A8fM3l+/fx5CBw/f12Ov0/0+s6cfr4/zxw+/vyydvn5AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAHBwQIDwAAAAcEBw8PAAAAAAAAAAAAAAAAAAAAAAAAAA8HAwMDAQAACAQDAgIBAADQkJBwaIREOPDw8NDY/Hw4AAAAAAAAAAAAAAAAAAAAAJCQ8PCQmIjI8PCQkPD4+PhLcvz/cXA4H35/n5d/Xy8f0lY//75eXPh+/vnpxuLs+AcHBAgPAAAABwQHDw8AAAAAAAAAAAAAAAAAAAAAAAAADwcDAwMBAAAIBAMDAwEAANCQ8PDohEQ4sPDw0Nj8fDgAAAAAAAAAAAAAAAAAAAAA8PDw8JCYiMjw8JCQ8Pj4+AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABwgRFhkRFxcHDx4fHg4KGuAQiGiYiOjo4PB4+HhwUFgHCDxDREw/DwcPM397ezoK4BAICIhIuLjg8Pj4+PjIyAcIEBAYFhEQBw8fHx8NDh/gEAgIGGiICODw+Pj4sHD4AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABcnIytaW34+GDw/Nmd+Zyfo5MTUWtp+fBg8/GzmfubkDwcDAwIDAwcIBAMCAwIDBoSCkpGJhcbk/P7+/////nwQEBAgKSlJSB8fHz8/P39/CEhIREQiIqT4+Pj8/P7+/AAABxkhIkJAAAAHHz8/f38AAMAgUEgICAAAwODw+Pj4AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAYDw8PCRERDh8PCQkPHx8OGPDw8JCIiHD48JCQ8Pj4cAUDAQEBAgQDBwMBAQEDBwPw4OAgEBAgwDDgIODw8ODAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABTfLiQ0OjnwHxr7///LyfAJPR6MRc/zwb8XN7///nJBgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQIBgeHxwAABg5HxMTFDw4OHBwIAAAJCgoUFAgAACBZiQ8PDw8PP9+PCQkJCQkPDw8PDw8OBAkJCQkJCQoEAAAf/9/PwAAAAB/gEA/AAABAv74+P4CAQED/wcH/wMBTEKceHh4eHh8fuxISEhISHh4cCAAAAAASEhQIAAAAAAAGCQ8JDwkfgAYPDw8PDx+eHh4eHh4eHhISEhISEhISAgwOHg8HB4OOFBIaCQUEgoAAAcfPz8fBwAABx8/Px8HAAAAPEKZpaUAAAA8fv///wAAAAwSKioqAAAADB4+Pj4wUJCQkKCgkDBw8PDw4ODwgEgwAAAAAADweDAAAAAAAA==";
const mesia_patch_data = Array.from(atob(mesia_spritesheet_chr), c => c.charCodeAt(0))
