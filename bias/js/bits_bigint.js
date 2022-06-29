export const BitsBigInt = {
    of: (...nums) => {
        let bits = ZERO;
        for (const num of nums) {
            bits |= ONE << BigInt(num);
        }
        return bits;
    },
    from: (nums) => {
        let bits = ZERO;
        for (const num of nums) {
            bits |= ONE << BigInt(num);
        }
        return bits;
    },
    containsAll: (superset, subset) => !(subset & ~superset),
    with: (bits, num) => bits | (ONE << BigInt(num)),
    without: (bits, num) => bits & ~(ONE << BigInt(num)),
    has: (bits, num) => !!(bits & (ONE << BigInt(num))),
    bits: (bits) => {
        const out = [];
        let offset = 0;
        while (bits) {
            let x = Number(bits & MAX_UINT32);
            let y = 32;
            while (x) {
                const z = Math.clz32(x) + 1;
                y -= z;
                x <<= z;
                if (z === 32)
                    x = 0;
                out.push(offset | y);
            }
            bits >>= THIRTY_TWO;
            offset += 32;
        }
        return out;
    },
    clone: (x) => x,
    empty: (x) => !x,
    difference: (left, right) => left & ~right,
    union: (left, right) => left | right,
};
export const BIGINT_OK = typeof BigInt === 'function' && typeof BigInt(0) === 'bigint';
const ZERO = (BIGINT_OK && BigInt(0));
const ONE = (BIGINT_OK && BigInt(1));
const MAX_UINT32 = (BIGINT_OK && BigInt(0xffffffff));
const THIRTY_TWO = (BIGINT_OK && BigInt(32));
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYml0c19iaWdpbnQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi9zcmMvanMvYml0c19iaWdpbnQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBRUEsTUFBTSxDQUFDLE1BQU0sVUFBVSxHQUEwQjtJQUMvQyxFQUFFLEVBQUUsQ0FBQyxHQUFHLElBQUksRUFBRSxFQUFFO1FBQ2QsSUFBSSxJQUFJLEdBQUcsSUFBSSxDQUFDO1FBQ2hCLEtBQUssTUFBTSxHQUFHLElBQUksSUFBSSxFQUFFO1lBQ3RCLElBQUksSUFBSSxHQUFHLElBQUksTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDO1NBQzVCO1FBQ0QsT0FBTyxJQUFJLENBQUM7SUFDZCxDQUFDO0lBRUQsSUFBSSxFQUFFLENBQUMsSUFBSSxFQUFFLEVBQUU7UUFDYixJQUFJLElBQUksR0FBRyxJQUFJLENBQUM7UUFDaEIsS0FBSyxNQUFNLEdBQUcsSUFBSSxJQUFJLEVBQUU7WUFDdEIsSUFBSSxJQUFJLEdBQUcsSUFBSSxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUM7U0FDNUI7UUFDRCxPQUFPLElBQUksQ0FBQztJQUNkLENBQUM7SUFFRCxXQUFXLEVBQUUsQ0FBQyxRQUFRLEVBQUUsTUFBTSxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUMsTUFBTSxHQUFHLENBQUMsUUFBUSxDQUFDO0lBRXhELElBQUksRUFBRSxDQUFDLElBQUksRUFBRSxHQUFHLEVBQUUsRUFBRSxDQUFDLElBQUksR0FBRyxDQUFDLEdBQUcsSUFBSSxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUM7SUFFaEQsT0FBTyxFQUFFLENBQUMsSUFBSSxFQUFFLEdBQUcsRUFBRSxFQUFFLENBQUMsSUFBSSxHQUFHLENBQUMsQ0FBQyxHQUFHLElBQUksTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDO0lBRXBELEdBQUcsRUFBRSxDQUFDLElBQUksRUFBRSxHQUFHLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksR0FBRyxDQUFDLEdBQUcsSUFBSSxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQztJQUVuRCxJQUFJLEVBQUUsQ0FBQyxJQUFJLEVBQUUsRUFBRTtRQUNiLE1BQU0sR0FBRyxHQUFHLEVBQUUsQ0FBQztRQUNmLElBQUksTUFBTSxHQUFHLENBQUMsQ0FBQztRQUNmLE9BQU8sSUFBSSxFQUFFO1lBQ1gsSUFBSSxDQUFDLEdBQUcsTUFBTSxDQUFDLElBQUksR0FBRyxVQUFVLENBQUMsQ0FBQztZQUNsQyxJQUFJLENBQUMsR0FBRyxFQUFFLENBQUM7WUFDWCxPQUFPLENBQUMsRUFBRTtnQkFDUixNQUFNLENBQUMsR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQztnQkFDNUIsQ0FBQyxJQUFJLENBQUMsQ0FBQztnQkFDUCxDQUFDLEtBQUssQ0FBQyxDQUFDO2dCQUNSLElBQUksQ0FBQyxLQUFLLEVBQUU7b0JBQUUsQ0FBQyxHQUFHLENBQUMsQ0FBQztnQkFFcEIsR0FBRyxDQUFDLElBQUksQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDLENBQUM7YUFDdEI7WUFDRCxJQUFJLEtBQUssVUFBVSxDQUFDO1lBQ3BCLE1BQU0sSUFBSSxFQUFFLENBQUM7U0FDZDtRQUNELE9BQU8sR0FBRyxDQUFDO0lBQ2IsQ0FBQztJQUVELEtBQUssRUFBRSxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQztJQUVmLEtBQUssRUFBRSxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDO0lBRWhCLFVBQVUsRUFBRSxDQUFDLElBQUksRUFBRSxLQUFLLEVBQUUsRUFBRSxDQUFDLElBQUksR0FBRyxDQUFDLEtBQUs7SUFFMUMsS0FBSyxFQUFFLENBQUMsSUFBSSxFQUFFLEtBQUssRUFBRSxFQUFFLENBQUMsSUFBSSxHQUFHLEtBQUs7Q0FDckMsQ0FBQztBQUVGLE1BQU0sQ0FBQyxNQUFNLFNBQVMsR0FDbEIsT0FBTyxNQUFNLEtBQUssVUFBVSxJQUFJLE9BQU8sTUFBTSxDQUFDLENBQUMsQ0FBQyxLQUFLLFFBQVEsQ0FBQztBQUNsRSxNQUFNLElBQUksR0FBRyxDQUFDLFNBQVMsSUFBSSxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQVcsQ0FBQztBQUNoRCxNQUFNLEdBQUcsR0FBRyxDQUFDLFNBQVMsSUFBSSxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQVcsQ0FBQztBQUMvQyxNQUFNLFVBQVUsR0FBRyxDQUFDLFNBQVMsSUFBSSxNQUFNLENBQUMsVUFBVSxDQUFDLENBQVcsQ0FBQztBQUMvRCxNQUFNLFVBQVUsR0FBRyxDQUFDLFNBQVMsSUFBSSxNQUFNLENBQUMsRUFBRSxDQUFDLENBQVcsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7Qml0c05hbWVzcGFjZX0gZnJvbSAnLi9iaXRzX2Jhc2UuanMnO1xuXG5leHBvcnQgY29uc3QgQml0c0JpZ0ludDogQml0c05hbWVzcGFjZTxiaWdpbnQ+ID0ge1xuICBvZjogKC4uLm51bXMpID0+IHtcbiAgICBsZXQgYml0cyA9IFpFUk87XG4gICAgZm9yIChjb25zdCBudW0gb2YgbnVtcykge1xuICAgICAgYml0cyB8PSBPTkUgPDwgQmlnSW50KG51bSk7XG4gICAgfVxuICAgIHJldHVybiBiaXRzO1xuICB9LFxuXG4gIGZyb206IChudW1zKSA9PiB7XG4gICAgbGV0IGJpdHMgPSBaRVJPO1xuICAgIGZvciAoY29uc3QgbnVtIG9mIG51bXMpIHtcbiAgICAgIGJpdHMgfD0gT05FIDw8IEJpZ0ludChudW0pO1xuICAgIH1cbiAgICByZXR1cm4gYml0cztcbiAgfSxcblxuICBjb250YWluc0FsbDogKHN1cGVyc2V0LCBzdWJzZXQpID0+ICEoc3Vic2V0ICYgfnN1cGVyc2V0KSxcblxuICB3aXRoOiAoYml0cywgbnVtKSA9PiBiaXRzIHwgKE9ORSA8PCBCaWdJbnQobnVtKSksXG5cbiAgd2l0aG91dDogKGJpdHMsIG51bSkgPT4gYml0cyAmIH4oT05FIDw8IEJpZ0ludChudW0pKSxcblxuICBoYXM6IChiaXRzLCBudW0pID0+ICEhKGJpdHMgJiAoT05FIDw8IEJpZ0ludChudW0pKSksXG5cbiAgYml0czogKGJpdHMpID0+IHtcbiAgICBjb25zdCBvdXQgPSBbXTtcbiAgICBsZXQgb2Zmc2V0ID0gMDtcbiAgICB3aGlsZSAoYml0cykge1xuICAgICAgbGV0IHggPSBOdW1iZXIoYml0cyAmIE1BWF9VSU5UMzIpO1xuICAgICAgbGV0IHkgPSAzMjtcbiAgICAgIHdoaWxlICh4KSB7XG4gICAgICAgIGNvbnN0IHogPSBNYXRoLmNsejMyKHgpICsgMTtcbiAgICAgICAgeSAtPSB6O1xuICAgICAgICB4IDw8PSB6O1xuICAgICAgICBpZiAoeiA9PT0gMzIpIHggPSAwO1xuICAgICAgICAvLyB1bmZvcnR1bmF0ZWx5IHRoaXMgd2lsbCBqdW1ibGUgdGhlIG9yZGVyIGEgYml0Li4uXG4gICAgICAgIG91dC5wdXNoKG9mZnNldCB8IHkpO1xuICAgICAgfVxuICAgICAgYml0cyA+Pj0gVEhJUlRZX1RXTztcbiAgICAgIG9mZnNldCArPSAzMjtcbiAgICB9XG4gICAgcmV0dXJuIG91dDtcbiAgfSxcblxuICBjbG9uZTogKHgpID0+IHgsXG5cbiAgZW1wdHk6ICh4KSA9PiAheCxcblxuICBkaWZmZXJlbmNlOiAobGVmdCwgcmlnaHQpID0+IGxlZnQgJiB+cmlnaHQsXG5cbiAgdW5pb246IChsZWZ0LCByaWdodCkgPT4gbGVmdCB8IHJpZ2h0LFxufTtcblxuZXhwb3J0IGNvbnN0IEJJR0lOVF9PSyA9XG4gICAgdHlwZW9mIEJpZ0ludCA9PT0gJ2Z1bmN0aW9uJyAmJiB0eXBlb2YgQmlnSW50KDApID09PSAnYmlnaW50JztcbmNvbnN0IFpFUk8gPSAoQklHSU5UX09LICYmIEJpZ0ludCgwKSkgYXMgYmlnaW50O1xuY29uc3QgT05FID0gKEJJR0lOVF9PSyAmJiBCaWdJbnQoMSkpIGFzIGJpZ2ludDtcbmNvbnN0IE1BWF9VSU5UMzIgPSAoQklHSU5UX09LICYmIEJpZ0ludCgweGZmZmZmZmZmKSkgYXMgYmlnaW50O1xuY29uc3QgVEhJUlRZX1RXTyA9IChCSUdJTlRfT0sgJiYgQmlnSW50KDMyKSkgYXMgYmlnaW50O1xuIl19