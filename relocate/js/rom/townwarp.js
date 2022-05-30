import { Address, Segment, tuple } from './util.js';
export class TownWarp {
    constructor(rom) {
        this.rom = rom;
        this.locations = tuple(rom.prg, ADDRESS.offset, COUNT);
        this.thunderSwordWarp = [rom.prg[0x3d5ca], rom.prg[0x3d5ce]];
    }
    write() {
        const a = this.rom.assembler();
        ADDRESS.loc(a);
        a.label('TownWarpTable');
        a.byte(...this.locations);
        a.org(0xdc8c);
        a.instruction('lda', 'TownWarpTable,y');
        a.org(0xd5c9);
        a.instruction('lda', '#' + this.thunderSwordWarp[0]);
        a.org(0xd5cd);
        a.instruction('lda', '#' + this.thunderSwordWarp[1]);
        return [a.module()];
    }
}
const ADDRESS = Address.of(Segment.$fe, 0xdc58);
const COUNT = 12;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidG93bndhcnAuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi9zcmMvanMvcm9tL3Rvd253YXJwLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUVBLE9BQU8sRUFBQyxPQUFPLEVBQUUsT0FBTyxFQUFFLEtBQUssRUFBQyxNQUFNLFdBQVcsQ0FBQztBQUdsRCxNQUFNLE9BQU8sUUFBUTtJQU9uQixZQUFxQixHQUFRO1FBQVIsUUFBRyxHQUFILEdBQUcsQ0FBSztRQUMzQixJQUFJLENBQUMsU0FBUyxHQUFHLEtBQUssQ0FBQyxHQUFHLENBQUMsR0FBRyxFQUFFLE9BQU8sQ0FBQyxNQUFNLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFDdkQsSUFBSSxDQUFDLGdCQUFnQixHQUFHLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxPQUFPLENBQUMsRUFBRSxHQUFHLENBQUMsR0FBRyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUM7SUFDL0QsQ0FBQztJQUVELEtBQUs7UUFDSCxNQUFNLENBQUMsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLFNBQVMsRUFBRSxDQUFDO1FBQy9CLE9BQU8sQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDZixDQUFDLENBQUMsS0FBSyxDQUFDLGVBQWUsQ0FBQyxDQUFDO1FBQ3pCLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUM7UUFDMUIsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsQ0FBQztRQUNkLENBQUMsQ0FBQyxXQUFXLENBQUMsS0FBSyxFQUFFLGlCQUFpQixDQUFDLENBQUM7UUFDeEMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsQ0FBQztRQUNkLENBQUMsQ0FBQyxXQUFXLENBQUMsS0FBSyxFQUFFLEdBQUcsR0FBRyxJQUFJLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUNyRCxDQUFDLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxDQUFDO1FBQ2QsQ0FBQyxDQUFDLFdBQVcsQ0FBQyxLQUFLLEVBQUUsR0FBRyxHQUFHLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ3JELE9BQU8sQ0FBQyxDQUFDLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQztJQUN0QixDQUFDO0NBQ0Y7QUFFRCxNQUFNLE9BQU8sR0FBRyxPQUFPLENBQUMsRUFBRSxDQUFDLE9BQU8sQ0FBQyxHQUFHLEVBQUUsTUFBTSxDQUFDLENBQUM7QUFDaEQsTUFBTSxLQUFLLEdBQUcsRUFBRSxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHtNb2R1bGV9IGZyb20gJy4uL2FzbS9tb2R1bGUuanMnO1xuaW1wb3J0IHtSb219IGZyb20gJy4uL3JvbS5qcyc7XG5pbXBvcnQge0FkZHJlc3MsIFNlZ21lbnQsIHR1cGxlfSBmcm9tICcuL3V0aWwuanMnO1xuXG4vLyBMaXN0IG9mIHRvd24gd2FycCBsb2NhdGlvbnMuXG5leHBvcnQgY2xhc3MgVG93bldhcnAge1xuXG4gIGxvY2F0aW9uczogbnVtYmVyW107XG5cbiAgLy8gKGxvY2F0aW9uLCBlbnRyYW5jZSkgcGFpciBmb3Igd2FycCBwb2ludC5cbiAgdGh1bmRlclN3b3JkV2FycDogcmVhZG9ubHkgW251bWJlciwgbnVtYmVyXTtcblxuICBjb25zdHJ1Y3RvcihyZWFkb25seSByb206IFJvbSkge1xuICAgIHRoaXMubG9jYXRpb25zID0gdHVwbGUocm9tLnByZywgQUREUkVTUy5vZmZzZXQsIENPVU5UKTtcbiAgICB0aGlzLnRodW5kZXJTd29yZFdhcnAgPSBbcm9tLnByZ1sweDNkNWNhXSwgcm9tLnByZ1sweDNkNWNlXV07XG4gIH1cblxuICB3cml0ZSgpOiBNb2R1bGVbXSB7XG4gICAgY29uc3QgYSA9IHRoaXMucm9tLmFzc2VtYmxlcigpO1xuICAgIEFERFJFU1MubG9jKGEpO1xuICAgIGEubGFiZWwoJ1Rvd25XYXJwVGFibGUnKTtcbiAgICBhLmJ5dGUoLi4udGhpcy5sb2NhdGlvbnMpO1xuICAgIGEub3JnKDB4ZGM4Yyk7XG4gICAgYS5pbnN0cnVjdGlvbignbGRhJywgJ1Rvd25XYXJwVGFibGUseScpO1xuICAgIGEub3JnKDB4ZDVjOSk7XG4gICAgYS5pbnN0cnVjdGlvbignbGRhJywgJyMnICsgdGhpcy50aHVuZGVyU3dvcmRXYXJwWzBdKTtcbiAgICBhLm9yZygweGQ1Y2QpO1xuICAgIGEuaW5zdHJ1Y3Rpb24oJ2xkYScsICcjJyArIHRoaXMudGh1bmRlclN3b3JkV2FycFsxXSk7XG4gICAgcmV0dXJuIFthLm1vZHVsZSgpXTtcbiAgfVxufVxuXG5jb25zdCBBRERSRVNTID0gQWRkcmVzcy5vZihTZWdtZW50LiRmZSwgMHhkYzU4KTtcbmNvbnN0IENPVU5UID0gMTI7XG4iXX0=