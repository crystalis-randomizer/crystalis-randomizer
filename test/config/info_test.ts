import { describe, it } from 'mocha';
import { expect } from 'chai';
import { /* MapFieldInfo, MessageFieldInfo, PrimitiveFieldInfo, RepeatedFieldInfo, TypeInfo,*/ FieldInfo, qnameVisitor, resolve } from '../../src/js/config/info';
import { Config, CheckName } from '../../target/build/config_proto';
import { ExpectErrors } from './util';

ExpectErrors.install();

describe('resolve', function() {
  it('should memoize', function() {
    const info = resolve(Config as any);
    expect(resolve(Config as any)).to.equal(info);
  });
});

describe('TypeInfo', function() {
  it('should have the right names', function() {
    const itemsInfo = resolve(Config.Items as any);
    expect(itemsInfo.name).to.equal('Items');
    expect(itemsInfo.fullName).to.equal('Config.Items');
  });

  describe('field()', function() {
    it('should return a FieldInfo for a valid field name', function() {
      const itemsInfo = resolve(Config.Items as any);
      expect(itemsInfo.field('chargeSpeed'))
          .to.equal(resolve((Config.Items as any).fields.chargeSpeed));
    });
    it('should return a FieldInfo for a field name with spaces', function() {
      const itemsInfo = resolve(Config.Items as any);
      expect(itemsInfo.field('chArge spEed'))
          .to.equal(resolve((Config.Items as any).fields.chargeSpeed));
    });
    it('should return undefined for a missing field', function() {
      const itemsInfo = resolve(Config.Items as any);
      expect(itemsInfo.field('xyzzy')).to.equal(undefined);
    });
  });

  describe('coerce()', function() {
    it('should return an instanceof of the message', function() {
      const itemsInfo = resolve(Config.Items as any);
      expect(itemsInfo.coerce({}, new ExpectErrors()))
          .to.be.instanceof(Config.Items.ctor);
    });
    it('should correct field spellings', function() {
      const itemsInfo = resolve(Config.Items as any);

      let result = itemsInfo.coerce({'chaRGE speED': 4}, new ExpectErrors());
      expect(result).to.eql(Config.Items.fromObject({chargeSpeed: 4}));

      result = itemsInfo.coerce({'charge_speed': 7}, new ExpectErrors());
      expect(result).to.eql(Config.Items.fromObject({chargeSpeed: 7}));
    });
    it('should coerce values', function() {
      const itemsInfo = resolve(Config.Items as any);
      const result = itemsInfo.coerce({chargeSpeed: 1.75}, new ExpectErrors());
      expect(result).to.eql(Config.Items.fromObject({chargeSpeed: 2}));
    });
    it('should report an error on a bad field name', function() {
      const itemsInfo = resolve(Config.Items as any);
      const expected = /Unknown field "foo"/;
      const result = itemsInfo.coerce({foo: 4, chargeSpeed: 3}, new ExpectErrors(expected));
      expect(result).to.eql(Config.Items.fromObject({chargeSpeed: 3}));
    });
    it('should report an error on a bad values', function() {
      const itemsInfo = resolve(Config.Items as any);
      const expected = /Cannot coerce non-number "x" for Config.Items.chargeSpeed/;
      const result = itemsInfo.coerce({chargeSpeed: 'x'}, new ExpectErrors(expected));
      expect(result).to.eql(Config.Items.fromObject({}));
    });
    it('should coerce nested objects', function() {
      const info = resolve(Config as any);
      const result = info.coerce({items: {ChargESpeeD: 1.75}}, new ExpectErrors());
      expect(result).to.eql(Config.fromObject({items: {chargeSpeed: 2}}));
    });
  });

  describe('fill()', function() {
    it('should fill in defaults', function() {
      const itemsInfo = resolve(Config.Items as any);
      const original = Config.Items.create();
      const filled = itemsInfo.fill(original);
      expect(filled).to.be.instanceof(Config.Items.ctor);
      expect(filled).not.to.equal(original);
      expect(Config.Items.verify(filled)).to.equal(null);

      expect(original.unidentifiedItems).to.equal(null);
      expect(original.chargeSpeed).to.equal(null);
      expect(original.chargeWhileWalkingSpeed).to.equal(null);
      expect(original.addSpeedBoots).to.equal(null);

      expect(filled.unidentifiedItems).to.equal(false);
      expect(filled.chargeSpeed).to.equal(7);
      expect(filled.chargeWhileWalkingSpeed).to.equal(0);
      expect(filled.addSpeedBoots).to.equal(true);
    });
    it('should fill nested messages', function() {
      const info = resolve(Config as any);
      const original = Config.create();
      const filled = info.fill(original);
      expect(Config.verify(filled)).to.equal(null);

      expect(original.items).to.equal(null);

      expect(filled.items!.unidentifiedItems).to.equal(false);
      expect(filled.items!.chargeSpeed).to.equal(7);
      expect(filled.items!.chargeWhileWalkingSpeed).to.equal(0);
      expect(filled.items!.addSpeedBoots).to.equal(true);
    });
  });

  describe('visit()', function() {
    it('visits type fields', function() {
      const visited = new Map<string, string>();
      const info = resolve(Config as any);
      info.visit(null, qnameVisitor((f: FieldInfo, v: unknown, qname: string) => {
        if (visited.has(qname)) throw new Error(`Duplicate qname: ${qname}`);
        expect(v).to.equal(undefined);
        visited.set(qname, f.fullName);
      }), '');
      // expect([...visited]).to.eql([
      //   //['items', 'Config.Items],
      //   ['items.chargeSpeed', 'Config.Items.chargeSpeed'],
      // ]);
      // expect(visited.get('items')).to.equal('Config.Items');
      expect(visited.get('items.chargeSpeed')).to.equal('Config.Items.chargeSpeed');
    });

    it('visits instance fields', function() {
      const visited = new Map<string, [string, unknown]>();
      const info = resolve(Config as any);
      const c = info.coerce({
        items: {
          chargeSpeed: 4,
          chargeWhileWalkingSpeed: 0,
        },
        enemies: {
          paletteSwap: true,
        },
      }) as Config;
      info.visit(c, qnameVisitor((f: FieldInfo, v: unknown, qname: string) => {
        if (visited.has(qname)) throw new Error(`Duplicate qname: ${qname}`);
        visited.set(qname, [f.fullName, v]);
      }), '');
      expect([...visited]).to.eql([
        ['items.chargeSpeed',
          ['Config.Items.chargeSpeed', 4]],
        ['items.chargeWhileWalkingSpeed',
          ['Config.Items.chargeWhileWalkingSpeed', 0]],
        ['enemies.paletteSwap',
          ['Config.Enemies.paletteSwap', true]],
      ]);
    });

    it('visits repeated instance fields', function() {
      const visited = new Map<string, [string, unknown]>();
      const info = resolve(Config as any);
      const c = info.coerce({
        placement: {
          initialInventory: ['swordOfWind', 'powerRing'],
        },
      }) as Config;
      info.visit(c, qnameVisitor((f: FieldInfo, v: unknown, qname: string) => {
        if (visited.has(qname)) throw new Error(`Duplicate qname: ${qname}`);
        visited.set(qname, [f.fullName, v]);
      }), '');

      expect([...visited]).to.eql([
        ['placement.initialInventory[0]',
          ['Config.Placement.initialInventory', 'SWORD_OF_WIND']],
        ['placement.initialInventory[1]',
          ['Config.Placement.initialInventory', 'POWER_RING']],
      ]);
    });

    it('visits map instance fields', function() {
      const visited = new Map<string, [string, unknown]>();
      const info = resolve(Config as any);
      const c = info.coerce({
        placement: {
          force: {
            leafElder: 'swordOfThunder',
            deo: 'bowOfTruth',
          },
        },
      }) as Config;
      info.visit(c, qnameVisitor((f: FieldInfo, v: unknown, qname: string) => {
        if (visited.has(qname)) throw new Error(`Duplicate qname: ${qname}`);
        visited.set(qname, [f.fullName, v]);
      }), '');

      expect([...visited]).to.eql([
        [`placement.force[${CheckName.LEAF_ELDER}]`,
          ['Config.Placement.force', 'SWORD_OF_THUNDER']],
        [`placement.force[${CheckName.DEO}]`,
          ['Config.Placement.force', 'BOW_OF_TRUTH']],
      ]);
    });
  });
});

// TODO - min/max/round
// TODO - field and enum aliases

// TODO - EnumInfo coercions?
//      - FieldInfo?
