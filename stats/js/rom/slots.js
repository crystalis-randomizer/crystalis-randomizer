import { Segment, relocExportLabel } from './util.js';
const { $0e } = Segment;
export class Slots extends Array {
    constructor(rom) {
        super(0x80);
        this.rom = rom;
        this.checkCount = 0x70;
        this.mimicCount = 0x10;
        for (let i = 0; i < 0x80; i++) {
            this[i] = i;
        }
    }
    setCheckCount(count) {
        this.checkCount = count;
    }
    setMimicCount(count) {
        this.mimicCount = count;
    }
    swap(i, j) {
        if (i === j)
            return;
        const tmp = this[i];
        this[i] = this[j];
        this[j] = tmp;
    }
    exportDigits(a, str, num) {
        const countAsStr = num.toString().padStart(3, "0");
        a.assign(`${str}_HUN`, Number(countAsStr[0]));
        a.export(`${str}_HUN`);
        a.assign(`${str}_TEN`, Number(countAsStr[1]));
        a.export(`${str}_TEN`);
        a.assign(`${str}_ONE`, Number(countAsStr[2]));
        a.export(`${str}_ONE`);
    }
    write() {
        const a = this.rom.assembler();
        relocExportLabel(a, [$0e], 'CheckToItemGetMap');
        this.exportDigits(a, "CHECK_COUNT", this.checkCount);
        this.exportDigits(a, "MIMIC_COUNT", this.mimicCount);
        a.byte(...this);
        return [a.module()];
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2xvdHMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi9zcmMvanMvcm9tL3Nsb3RzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUdBLE9BQU8sRUFBQyxPQUFPLEVBQUUsZ0JBQWdCLEVBQUMsTUFBTSxXQUFXLENBQUM7QUFFcEQsTUFBTSxFQUFDLEdBQUcsRUFBQyxHQUFHLE9BQU8sQ0FBQztBQUV0QixNQUFNLE9BQU8sS0FBTSxTQUFRLEtBQWE7SUFLdEMsWUFBcUIsR0FBUTtRQUMzQixLQUFLLENBQUMsSUFBSSxDQUFDLENBQUM7UUFETyxRQUFHLEdBQUgsR0FBRyxDQUFLO1FBSHJCLGVBQVUsR0FBWSxJQUFJLENBQUM7UUFDM0IsZUFBVSxHQUFZLElBQUksQ0FBQztRQUlqQyxLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsSUFBSSxFQUFFLENBQUMsRUFBRSxFQUFFO1lBRTdCLElBQUksQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUM7U0FDYjtJQUNILENBQUM7SUFFRCxhQUFhLENBQUMsS0FBYTtRQUN6QixJQUFJLENBQUMsVUFBVSxHQUFHLEtBQUssQ0FBQztJQUMxQixDQUFDO0lBRUQsYUFBYSxDQUFDLEtBQWE7UUFDekIsSUFBSSxDQUFDLFVBQVUsR0FBRyxLQUFLLENBQUM7SUFDMUIsQ0FBQztJQUVELElBQUksQ0FBQyxDQUFTLEVBQUUsQ0FBUztRQUN2QixJQUFJLENBQUMsS0FBSyxDQUFDO1lBQUUsT0FBTztRQUNwQixNQUFNLEdBQUcsR0FBRyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDcEIsSUFBSSxDQUFDLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUNsQixJQUFJLENBQUMsQ0FBQyxDQUFDLEdBQUcsR0FBRyxDQUFDO0lBQ2hCLENBQUM7SUFFRCxZQUFZLENBQUMsQ0FBVyxFQUFFLEdBQVcsRUFBRSxHQUFXO1FBQ2hELE1BQU0sVUFBVSxHQUFHLEdBQUcsQ0FBQyxRQUFRLEVBQUUsQ0FBQyxRQUFRLENBQUMsQ0FBQyxFQUFFLEdBQUcsQ0FBQyxDQUFDO1FBQ25ELENBQUMsQ0FBQyxNQUFNLENBQUMsR0FBRyxHQUFHLE1BQU0sRUFBRSxNQUFNLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUM5QyxDQUFDLENBQUMsTUFBTSxDQUFDLEdBQUcsR0FBRyxNQUFNLENBQUMsQ0FBQztRQUN2QixDQUFDLENBQUMsTUFBTSxDQUFDLEdBQUcsR0FBRyxNQUFNLEVBQUUsTUFBTSxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDOUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxHQUFHLEdBQUcsTUFBTSxDQUFDLENBQUM7UUFDdkIsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxHQUFHLEdBQUcsTUFBTSxFQUFFLE1BQU0sQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQzlDLENBQUMsQ0FBQyxNQUFNLENBQUMsR0FBRyxHQUFHLE1BQU0sQ0FBQyxDQUFDO0lBQ3pCLENBQUM7SUFFRCxLQUFLO1FBQ0gsTUFBTSxDQUFDLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxTQUFTLEVBQUUsQ0FBQztRQUMvQixnQkFBZ0IsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxHQUFHLENBQUMsRUFBRSxtQkFBbUIsQ0FBQyxDQUFDO1FBQ2hELElBQUksQ0FBQyxZQUFZLENBQUMsQ0FBQyxFQUFFLGFBQWEsRUFBRSxJQUFJLENBQUMsVUFBVSxDQUFDLENBQUM7UUFDckQsSUFBSSxDQUFDLFlBQVksQ0FBQyxDQUFDLEVBQUUsYUFBYSxFQUFFLElBQUksQ0FBQyxVQUFVLENBQUMsQ0FBQztRQUNyRCxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUcsSUFBSSxDQUFDLENBQUM7UUFDaEIsT0FBTyxDQUFDLENBQUMsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDO0lBQ3RCLENBQUM7Q0FDRiIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IEFzc2VtYmxlciB9IGZyb20gJy4uL2FzbS9hc3NlbWJsZXIuanMnO1xuaW1wb3J0IHtNb2R1bGV9IGZyb20gJy4uL2FzbS9tb2R1bGUuanMnO1xuaW1wb3J0IHtSb219IGZyb20gJy4uL3JvbS5qcyc7XG5pbXBvcnQge1NlZ21lbnQsIHJlbG9jRXhwb3J0TGFiZWx9IGZyb20gJy4vdXRpbC5qcyc7XG5cbmNvbnN0IHskMGV9ID0gU2VnbWVudDtcblxuZXhwb3J0IGNsYXNzIFNsb3RzIGV4dGVuZHMgQXJyYXk8bnVtYmVyPiB7XG5cbiAgcHJpdmF0ZSBjaGVja0NvdW50IDogbnVtYmVyID0gMHg3MDtcbiAgcHJpdmF0ZSBtaW1pY0NvdW50IDogbnVtYmVyID0gMHgxMDtcblxuICBjb25zdHJ1Y3RvcihyZWFkb25seSByb206IFJvbSkge1xuICAgIHN1cGVyKDB4ODApO1xuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgMHg4MDsgaSsrKSB7XG4gICAgICAvLyB0aGlzW2ldID0gcm9tLnByZ1tCQVNFICsgaV07XG4gICAgICB0aGlzW2ldID0gaTtcbiAgICB9XG4gIH1cblxuICBzZXRDaGVja0NvdW50KGNvdW50OiBudW1iZXIpIHtcbiAgICB0aGlzLmNoZWNrQ291bnQgPSBjb3VudDtcbiAgfVxuICBcbiAgc2V0TWltaWNDb3VudChjb3VudDogbnVtYmVyKSB7XG4gICAgdGhpcy5taW1pY0NvdW50ID0gY291bnQ7XG4gIH1cblxuICBzd2FwKGk6IG51bWJlciwgajogbnVtYmVyKSB7XG4gICAgaWYgKGkgPT09IGopIHJldHVybjtcbiAgICBjb25zdCB0bXAgPSB0aGlzW2ldO1xuICAgIHRoaXNbaV0gPSB0aGlzW2pdO1xuICAgIHRoaXNbal0gPSB0bXA7XG4gIH1cblxuICBleHBvcnREaWdpdHMoYTpBc3NlbWJsZXIsIHN0cjogU3RyaW5nLCBudW06IG51bWJlciwpIHtcbiAgICBjb25zdCBjb3VudEFzU3RyID0gbnVtLnRvU3RyaW5nKCkucGFkU3RhcnQoMywgXCIwXCIpO1xuICAgIGEuYXNzaWduKGAke3N0cn1fSFVOYCwgTnVtYmVyKGNvdW50QXNTdHJbMF0pKTtcbiAgICBhLmV4cG9ydChgJHtzdHJ9X0hVTmApO1xuICAgIGEuYXNzaWduKGAke3N0cn1fVEVOYCwgTnVtYmVyKGNvdW50QXNTdHJbMV0pKTtcbiAgICBhLmV4cG9ydChgJHtzdHJ9X1RFTmApO1xuICAgIGEuYXNzaWduKGAke3N0cn1fT05FYCwgTnVtYmVyKGNvdW50QXNTdHJbMl0pKTtcbiAgICBhLmV4cG9ydChgJHtzdHJ9X09ORWApO1xuICB9XG5cbiAgd3JpdGUoKTogTW9kdWxlW10ge1xuICAgIGNvbnN0IGEgPSB0aGlzLnJvbS5hc3NlbWJsZXIoKTtcbiAgICByZWxvY0V4cG9ydExhYmVsKGEsIFskMGVdLCAnQ2hlY2tUb0l0ZW1HZXRNYXAnKTtcbiAgICB0aGlzLmV4cG9ydERpZ2l0cyhhLCBcIkNIRUNLX0NPVU5UXCIsIHRoaXMuY2hlY2tDb3VudCk7XG4gICAgdGhpcy5leHBvcnREaWdpdHMoYSwgXCJNSU1JQ19DT1VOVFwiLCB0aGlzLm1pbWljQ291bnQpO1xuICAgIGEuYnl0ZSguLi50aGlzKTtcbiAgICByZXR1cm4gW2EubW9kdWxlKCldO1xuICB9XG59XG4iXX0=