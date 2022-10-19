export function TilePair(x) { return x; }
(function (TilePair) {
    function of(from, to) {
        return (from * (1 << 24) + to);
    }
    TilePair.of = of;
    function split(pair) {
        return [Math.floor(pair / (1 << 24)),
            pair % (1 << 24)];
    }
    TilePair.split = split;
})(TilePair || (TilePair = {}));
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGlsZXBhaXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi9zcmMvanMvbG9naWMvdGlsZXBhaXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBSUEsTUFBTSxVQUFVLFFBQVEsQ0FBQyxDQUFTLElBQWMsT0FBTyxDQUFhLENBQUMsQ0FBQyxDQUFDO0FBQ3ZFLFdBQWlCLFFBQVE7SUFDdkIsU0FBZ0IsRUFBRSxDQUFDLElBQVksRUFBRSxFQUFVO1FBQ3pDLE9BQU8sQ0FBQyxJQUFJLEdBQUcsQ0FBQyxDQUFDLElBQUksRUFBRSxDQUFDLEdBQUcsRUFBRSxDQUFhLENBQUM7SUFDN0MsQ0FBQztJQUZlLFdBQUUsS0FFakIsQ0FBQTtJQUNELFNBQWdCLEtBQUssQ0FBQyxJQUFjO1FBQ2xDLE9BQU8sQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLElBQUksR0FBRyxDQUFDLENBQUMsSUFBSSxFQUFFLENBQUMsQ0FBVztZQUN0QyxJQUFJLEdBQUcsQ0FBQyxDQUFDLElBQUksRUFBRSxDQUFXLENBQUMsQ0FBQztJQUN0QyxDQUFDO0lBSGUsY0FBSyxRQUdwQixDQUFBO0FBQ0gsQ0FBQyxFQVJnQixRQUFRLEtBQVIsUUFBUSxRQVF4QiIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7VGlsZUlkfSBmcm9tICcuL3RpbGVpZC5qcyc7XG5cbi8vIDQ4LWJpdCBjb25uZWN0aW9uIGJldHdlZW4gdHdvIHRpbGVzLlxuZXhwb3J0IHR5cGUgVGlsZVBhaXIgPSBudW1iZXIgJiB7X190aWxlUGFpcl9fOiBuZXZlcn07XG5leHBvcnQgZnVuY3Rpb24gVGlsZVBhaXIoeDogbnVtYmVyKTogVGlsZVBhaXIgeyByZXR1cm4geCBhcyBUaWxlUGFpcjsgfVxuZXhwb3J0IG5hbWVzcGFjZSBUaWxlUGFpciB7XG4gIGV4cG9ydCBmdW5jdGlvbiBvZihmcm9tOiBUaWxlSWQsIHRvOiBUaWxlSWQpOiBUaWxlUGFpciB7XG4gICAgcmV0dXJuIChmcm9tICogKDEgPDwgMjQpICsgdG8pIGFzIFRpbGVQYWlyO1xuICB9XG4gIGV4cG9ydCBmdW5jdGlvbiBzcGxpdChwYWlyOiBUaWxlUGFpcik6IFtUaWxlSWQsIFRpbGVJZF0ge1xuICAgIHJldHVybiBbTWF0aC5mbG9vcihwYWlyIC8gKDEgPDwgMjQpKSBhcyBUaWxlSWQsXG4gICAgICAgICAgICBwYWlyICUgKDEgPDwgMjQpIGFzIFRpbGVJZF07XG4gIH1cbn1cbiJdfQ==