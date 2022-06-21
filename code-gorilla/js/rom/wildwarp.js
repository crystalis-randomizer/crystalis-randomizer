import { Address, Segment, tuple } from './util.js';
export class WildWarp {
    constructor(rom) {
        this.rom = rom;
        this.locations = tuple(rom.prg, ADDRESS.offset, COUNT);
    }
    write() {
        const a = this.rom.assembler();
        ADDRESS.loc(a);
        a.label('WildWarpLocations');
        a.byte(...this.locations);
        a.org(0xcbd9);
        a.instruction('lda', 'WildWarpLocations,y');
        return [a.module()];
    }
}
const ADDRESS = Address.of(Segment.$fe, 0xcbec);
const COUNT = 16;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid2lsZHdhcnAuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi9zcmMvanMvcm9tL3dpbGR3YXJwLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUVBLE9BQU8sRUFBQyxPQUFPLEVBQUUsT0FBTyxFQUFFLEtBQUssRUFBQyxNQUFNLFdBQVcsQ0FBQztBQUdsRCxNQUFNLE9BQU8sUUFBUTtJQUluQixZQUFxQixHQUFRO1FBQVIsUUFBRyxHQUFILEdBQUcsQ0FBSztRQUMzQixJQUFJLENBQUMsU0FBUyxHQUFHLEtBQUssQ0FBQyxHQUFHLENBQUMsR0FBRyxFQUFFLE9BQU8sQ0FBQyxNQUFNLEVBQUUsS0FBSyxDQUFDLENBQUM7SUFDekQsQ0FBQztJQUVELEtBQUs7UUFDSCxNQUFNLENBQUMsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLFNBQVMsRUFBRSxDQUFDO1FBQy9CLE9BQU8sQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDZixDQUFDLENBQUMsS0FBSyxDQUFDLG1CQUFtQixDQUFDLENBQUM7UUFDN0IsQ0FBQyxDQUFDLElBQUksQ0FBQyxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQztRQUMxQixDQUFDLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxDQUFDO1FBQ2QsQ0FBQyxDQUFDLFdBQVcsQ0FBQyxLQUFLLEVBQUUscUJBQXFCLENBQUMsQ0FBQztRQUM1QyxPQUFPLENBQUMsQ0FBQyxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUM7SUFDdEIsQ0FBQztDQUNGO0FBRUQsTUFBTSxPQUFPLEdBQUcsT0FBTyxDQUFDLEVBQUUsQ0FBQyxPQUFPLENBQUMsR0FBRyxFQUFFLE1BQU0sQ0FBQyxDQUFDO0FBQ2hELE1BQU0sS0FBSyxHQUFHLEVBQUUsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7TW9kdWxlfSBmcm9tICcuLi9hc20vbW9kdWxlLmpzJztcbmltcG9ydCB7Um9tfSBmcm9tICcuLi9yb20uanMnO1xuaW1wb3J0IHtBZGRyZXNzLCBTZWdtZW50LCB0dXBsZX0gZnJvbSAnLi91dGlsLmpzJztcblxuLy8gTGlzdCBvZiB3aWxkIHdhcnAgbG9jYXRpb25zLlxuZXhwb3J0IGNsYXNzIFdpbGRXYXJwIHtcblxuICBsb2NhdGlvbnM6IG51bWJlcltdO1xuXG4gIGNvbnN0cnVjdG9yKHJlYWRvbmx5IHJvbTogUm9tKSB7XG4gICAgdGhpcy5sb2NhdGlvbnMgPSB0dXBsZShyb20ucHJnLCBBRERSRVNTLm9mZnNldCwgQ09VTlQpO1xuICB9XG5cbiAgd3JpdGUoKTogTW9kdWxlW10ge1xuICAgIGNvbnN0IGEgPSB0aGlzLnJvbS5hc3NlbWJsZXIoKTtcbiAgICBBRERSRVNTLmxvYyhhKTtcbiAgICBhLmxhYmVsKCdXaWxkV2FycExvY2F0aW9ucycpO1xuICAgIGEuYnl0ZSguLi50aGlzLmxvY2F0aW9ucyk7XG4gICAgYS5vcmcoMHhjYmQ5KTtcbiAgICBhLmluc3RydWN0aW9uKCdsZGEnLCAnV2lsZFdhcnBMb2NhdGlvbnMseScpO1xuICAgIHJldHVybiBbYS5tb2R1bGUoKV07XG4gIH1cbn1cblxuY29uc3QgQUREUkVTUyA9IEFkZHJlc3Mub2YoU2VnbWVudC4kZmUsIDB4Y2JlYyk7XG5jb25zdCBDT1VOVCA9IDE2O1xuIl19