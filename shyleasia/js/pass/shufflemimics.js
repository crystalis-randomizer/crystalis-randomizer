import { iters } from '../util.js';
export function shuffleMimics(rom, flags, random) {
    var _a, _b;
    const chests = [];
    const mimics = [];
    for (const location of rom.locations) {
        for (const spawn of location.spawns) {
            if (spawn.isChest()) {
                const slot = rom.slots[spawn.id];
                if (slot >= 0x70)
                    mimics.push(spawn.id);
                if (flags.preserveUniqueChecks()) {
                    const itemget = rom.itemGets[slot];
                    const item = rom.items[(_a = itemget) === null || _a === void 0 ? void 0 : _a.itemId];
                    if ((_b = item) === null || _b === void 0 ? void 0 : _b.unique)
                        continue;
                }
                if (spawn.isInvisible())
                    continue;
                chests.push(spawn.id);
            }
        }
    }
    random.shuffle(chests);
    iters.zip(mimics, chests, rom.slots.swap.bind(rom));
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2h1ZmZsZW1pbWljcy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uL3NyYy9qcy9wYXNzL3NodWZmbGVtaW1pY3MudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBR0EsT0FBTyxFQUFDLEtBQUssRUFBQyxNQUFNLFlBQVksQ0FBQztBQUVqQyxNQUFNLFVBQVUsYUFBYSxDQUFDLEdBQVEsRUFBRSxLQUFjLEVBQUUsTUFBYzs7SUFHcEUsTUFBTSxNQUFNLEdBQWEsRUFBRSxDQUFDO0lBQzVCLE1BQU0sTUFBTSxHQUFhLEVBQUUsQ0FBQztJQUM1QixLQUFLLE1BQU0sUUFBUSxJQUFJLEdBQUcsQ0FBQyxTQUFTLEVBQUU7UUFDcEMsS0FBSyxNQUFNLEtBQUssSUFBSSxRQUFRLENBQUMsTUFBTSxFQUFFO1lBQ25DLElBQUksS0FBSyxDQUFDLE9BQU8sRUFBRSxFQUFFO2dCQUVuQixNQUFNLElBQUksR0FBRyxHQUFHLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUMsQ0FBQztnQkFDakMsSUFBSSxJQUFJLElBQUksSUFBSTtvQkFBRSxNQUFNLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUMsQ0FBQztnQkFDeEMsSUFBSSxLQUFLLENBQUMsb0JBQW9CLEVBQUUsRUFBRTtvQkFDaEMsTUFBTSxPQUFPLEdBQUcsR0FBRyxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsQ0FBQztvQkFDbkMsTUFBTSxJQUFJLEdBQUcsR0FBRyxDQUFDLEtBQUssT0FBQyxPQUFPLDBDQUFFLE1BQU0sQ0FBQyxDQUFDO29CQUN4QyxVQUFJLElBQUksMENBQUUsTUFBTTt3QkFBRSxTQUFTO2lCQUM1QjtnQkFDRCxJQUFJLEtBQUssQ0FBQyxXQUFXLEVBQUU7b0JBQUUsU0FBUztnQkFFbEMsTUFBTSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDLENBQUM7YUFDdkI7U0FDRjtLQUNGO0lBRUQsTUFBTSxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsQ0FBQztJQUV2QixLQUFLLENBQUMsR0FBRyxDQUFDLE1BQU0sRUFBRSxNQUFNLEVBQUUsR0FBRyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUM7QUFDdEQsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7RmxhZ1NldH0gZnJvbSAnLi4vZmxhZ3NldC5qcyc7XG5pbXBvcnQge1JhbmRvbX0gZnJvbSAnLi4vcmFuZG9tLmpzJztcbmltcG9ydCB7Um9tfSBmcm9tICcuLi9yb20uanMnO1xuaW1wb3J0IHtpdGVyc30gZnJvbSAnLi4vdXRpbC5qcyc7XG5cbmV4cG9ydCBmdW5jdGlvbiBzaHVmZmxlTWltaWNzKHJvbTogUm9tLCBmbGFnczogRmxhZ1NldCwgcmFuZG9tOiBSYW5kb20pIHtcbiAgLy8gTk9URTogaWYgZmxhZ3MucHJlc2VydmVVbmlxdWVDaGVja3MoKSB0aGVuIG9ubHkgZG8gbm9udW5pcXVlIGNoZXN0c1xuICAvLyAxLiBnYXRoZXIgYWxsIHRoZSBjaGVzdHNcbiAgY29uc3QgY2hlc3RzOiBudW1iZXJbXSA9IFtdO1xuICBjb25zdCBtaW1pY3M6IG51bWJlcltdID0gW107XG4gIGZvciAoY29uc3QgbG9jYXRpb24gb2Ygcm9tLmxvY2F0aW9ucykge1xuICAgIGZvciAoY29uc3Qgc3Bhd24gb2YgbG9jYXRpb24uc3Bhd25zKSB7XG4gICAgICBpZiAoc3Bhd24uaXNDaGVzdCgpKSB7XG4gICAgICAgIC8vIElzIHRoaXMgYW4gZWxpZ2libGUgY2hlc3Q/XG4gICAgICAgIGNvbnN0IHNsb3QgPSByb20uc2xvdHNbc3Bhd24uaWRdO1xuICAgICAgICBpZiAoc2xvdCA+PSAweDcwKSBtaW1pY3MucHVzaChzcGF3bi5pZCk7XG4gICAgICAgIGlmIChmbGFncy5wcmVzZXJ2ZVVuaXF1ZUNoZWNrcygpKSB7XG4gICAgICAgICAgY29uc3QgaXRlbWdldCA9IHJvbS5pdGVtR2V0c1tzbG90XTtcbiAgICAgICAgICBjb25zdCBpdGVtID0gcm9tLml0ZW1zW2l0ZW1nZXQ/Lml0ZW1JZF07XG4gICAgICAgICAgaWYgKGl0ZW0/LnVuaXF1ZSkgY29udGludWU7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHNwYXduLmlzSW52aXNpYmxlKCkpIGNvbnRpbnVlO1xuICAgICAgICAvLyBBZGQgZWxpZ2libGUgY2hlc3RzXG4gICAgICAgIGNoZXN0cy5wdXNoKHNwYXduLmlkKTtcbiAgICAgIH1cbiAgICB9XG4gIH1cbiAgLy8gMi4gc2h1ZmZsZSB0aGUgY2hlc3RzLlxuICByYW5kb20uc2h1ZmZsZShjaGVzdHMpO1xuICAvLyAzLiB6aXAgdGhlIGNoZXN0cyBhbmQgbWltaWNzIHRvZ2V0aGVyIGFuZCBzd2FwLlxuICBpdGVycy56aXAobWltaWNzLCBjaGVzdHMsIHJvbS5zbG90cy5zd2FwLmJpbmQocm9tKSk7XG59XG4iXX0=