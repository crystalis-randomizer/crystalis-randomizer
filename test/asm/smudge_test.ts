import {describe, expect, it} from 'bun:test';
import { Cpu } from '../../src/js/asm/cpu';
import * as lib from '../../src/js/asm/smudge';

function smudge(src: string): string {
  return lib.smudge(src, Cpu.P02, prg);
}
function clean(src: string): string {
  return lib.clean(src, Cpu.P02, prg);
}

const prg = Uint8Array.from([
  'a9 05',    // 00  lda #$05
  '85 42',    // 02  sta $42
  '8d 34 12', // 04  sta $1234
  'd0 f9',    // 07  bne $0002
  '20 1c 00', // 09  jsr $001c
  'b5 14',    // 0c  lda $14,x
  '9d 56 34', // 0e  sta $3456,x
  'be 23 78', // 11  ldx $7823,y
  '96 67',    // 14  stx $67,y
  '6c cd ab', // 16  jmp ($abcd)
  '1a 2b 3c', // 19  .byte $1a,$2b,$3c
  'a1 43 65', // 1c  lda ($6543,x)
  '0a',       // 1f  asl
  '91 89',    // 20  sta ($89),y
  '60',       // 22  rts
  'a9 05',    // 23  lda #$05
  '8d 34 12', // 25  sta $1234
  'b5 14',    // 28  lda $14,x
  '9d 56 34', // 2a  sta $3456,x
  '60',       // 2d  rts
  '22 23 5c', // 2e  .text "\"#\\"
].join(' ').split(/ /g).map(x => parseInt(x, 16)));

describe('smudge', function() {
  it('should not affect trivial files', function() {
    const input = 'abc\ndef\n12345';
    expect(smudge(input)).toEqual(input);
  });
  it('should decode data', function() {
    expect(smudge('.byte [@19@],[@1a@],[@1b@]')).toEqual('.byte $1a,$2b,$3c');
  });
  it('should decode data with extra formatting', function() {
    expect(smudge('.byte  [@19@] , [@1a@] , [@1b@] ; comment'))
        .toEqual('.byte  $1a , $2b , $3c ; comment');
  });
  it('should decode words', function() {
    expect(smudge('.word [@19:w@]')).toEqual('.word ($2b1a)');
  });
  it('should decode text', function() {
    expect(smudge('.asciiz [@15:2@],[@2b:3@]')).toEqual('.asciiz "gl","V4`"');
  });
  it('should decode text with proper escaping', function() {
    expect(smudge('.asciiz [@2e:3@]')).toEqual('.asciiz "\\"#\\\\"');
  });
  it('should decode binary data', function() {
    expect(smudge('.byte [@19:b@]')).toEqual('.byte %00011010');
  });
  it('should decode decimal data', function() {
    expect(smudge('.byte [@19:d@]')).toEqual('.byte 26');
  });
  it('should decode instructions', function() {
    expect(smudge('<@0@>')).toEqual('lda #$05');
  });
  it('should retain labels, spaces and comments around instructions', function() {
    expect(smudge('foo: <@2@>  ; comment')).toEqual('foo: sta $42  ; comment');
    expect(smudge('  <@c@>  ')).toEqual('  lda $14,x  ');
    expect(smudge('@bar: <@11@>')).toEqual('@bar: ldx $7823,y');
  });
  it('should handle relative labels', function() {
    expect(smudge('++ <@4@>')).toEqual('++ sta $1234');
    expect(smudge('- <@9@>')).toEqual('- jsr $001c');
    expect(smudge(': <@e@>')).toEqual(': sta $3456,x');
  });
  it('should retain explicit arguments', function() {
    expect(smudge('<@0 a@>')).toEqual('lda #a');
    expect(smudge('<@2 xyz@>')).toEqual('sta xyz');
    expect(smudge('<@4 1+2@>')).toEqual('sta 1+2');
    expect(smudge('<@7 l a b e l@>')).toEqual('bne l a b e l');
    expect(smudge('<@1f ignored@>')).toEqual('asl');
    expect(smudge('<@14 103@>')).toEqual('stx 103,y');
    expect(smudge('<@16 x@>')).toEqual('jmp (x)');
    expect(smudge('<@20 x@>')).toEqual('sta (x),y');
  });
  it('should handle a relative jump with no explicit args', function() {
    expect(smudge('<@7@>')).toEqual('bne *-5');
  });
  it('should retain newlines', function() {
    expect(smudge('  .byte [@19@],[@1a@]\n  .byte [@1b@],[@1c@]\n'))
        .toEqual('  .byte $1a,$2b\n  .byte $3c,$a1\n');
    expect(smudge('  <@c@>\n  <@e@>\n')).toEqual('  lda $14,x\n  sta $3456,x\n');
  });
});

describe('clean', function() {
  it('should not affect trivial files', function() {
    const input = 'abc\ndef\n12345';
    expect(clean(input)).toEqual(input);
  });
  it('should encode data', function() {
    expect(clean('.byte $1a,$2b,$3c')).toEqual('.byte [@19@],[@1a@],[@1b@]');
  });
  it('should encode noncontiguous data', function() {
    expect(clean('.byte $6c,$2b,$43')).toEqual('.byte [@16@],[@1a@],[@1d@]');
  });
  it('should not encode data with no match', function() {
    expect(clean('.byte $67,$61,$6c')).toEqual('.byte [@15@],$61,[@16@]');
  });
  it('should encode words', function() {
    expect(clean('.word ($2b1a),($6543)')).toEqual('.word [@19:w@],[@1d:w@]');
  });
  it('should not encode words with no match', function() {
    expect(clean('.word ($1234),($acef)')).toEqual('.word [@5:w@],($acef)');
  });
  it('should encode the same word twice if necessary', function() {
    expect(clean('.word ($7823),($7823)')).toEqual('.word [@12:w@],[@12:w@]');
  });
  it('should encode text', function() {
    expect(clean('.asciiz "gl","V4`"')).toEqual('.asciiz [@15:2@],[@2b:3@]');
  });
  it('should encode escaped text', function() {
    expect(clean('.asciiz "\\"#\\\\"')).toEqual('.asciiz [@2e:3@]');
  });
  it('should not encode text with no match', function() {
    expect(clean('.asciiz "gl","gm","g"'))
        .toEqual('.asciiz [@15:2@],"gm",[@15:1@]');
  });
  it('should encode instructions', function() {
    expect(clean('lda #$05')).toEqual('<@0@>');
  });
  it('should retain labels, spaces and comments around instructions', function() {
    expect(clean('foo: sta $42  ; comment')).toEqual('foo: <@2@>  ; comment');
    expect(clean('  lda $14,x  ')).toEqual('  <@c@>  ');
    expect(clean('@bar: ldx $7823,y')).toEqual('@bar: <@11@>');
  });
  it('should handle relative labels', function() {
    expect(clean('++ sta $1234')).toEqual('++ <@4@>');
    expect(clean('- jsr $001c')).toEqual('- <@9@>');
    expect(clean(': sta $3456,x')).toEqual(': <@e@>');
  });
  it('should retain explicit arguments', function() {
    expect(clean('lda #a')).toEqual('<@0 a@>');
    expect(clean('sta xyz')).toEqual('<@2 xyz@>');
    expect(clean('sta 1+2')).toEqual('<@2 1+2@>'); // note: can't tell which to use
    expect(clean('asl')).toEqual('<@1f@>');
    expect(clean('stx 103,y')).toEqual('<@14 103@>');
    expect(clean('jmp (x)')).toEqual('<@16 x@>');
    expect(clean('sta (x),y')).toEqual('<@20 x@>');
  });
  it('should use successive versions of the same instruction', function() {
    expect(clean('lda #$05\nlda #$05\nlda #$05')).toEqual('<@0@>\n<@23@>\n<@0@>');
  });
  it('should respect `from` comments', function() {
    expect(clean('lda #$05 ; from $20')).toEqual('<@23@> ; from $20');
  });
  it('should respect `push` and `pop`', function() {
    expect(clean('; @(@\nlda #$05 ; from $20\n; @)@\nlda #$05'))
        .toEqual('; @(@\n<@23@> ; from $20\n; @)@\n<@0@>');
  });
  it('should merge preprocessor branches', function() {
    expect(clean('.if 1\nlda #$05\n.elseif 2\nsta $1234\n' +
                 '.else\nasl\n.endif\nsta $42'))
        .toEqual('.if 1\n<@0@>\n.elseif 2\n<@4@>\n.else\n<@1f@>\n.endif\n<@2@>');
  });
  it('should clean simple assignments', function() {
    expect(clean('lda <var,x\nvar = $14'))
        .toEqual('<@c <var@>\nvar = [@d@]');
  });
  it('should clean assignments with comments', function() {
    expect(clean('lda <var,x\n  var = $14 ; comment\n; a'))
        .toEqual('<@c <var@>\n  var = [@d@] ; comment\n; a');
  });
});
