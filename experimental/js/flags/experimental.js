export const EXPERIMENTAL_FLAGS = {
    section: 'Experimental',
    prefix: 'X',
    flags: [
        {
            flag: 'Xc',
            name: 'Extra checks',
            text: `Add two extra checks in the initial area.  This requires Re and
             results in an item on the student, as well as two chests in the
             East Cave.`,
        },
        {
            flag: 'Xe',
            name: 'East Cave (GBC)',
            text: `Add the "East Cave" from the GBC version.  If this is selected
             then the initial Alarm Flute will be found in a chest on the
             second floor of this cave.  If Rp is also selected, then there
             will be a second exit from this cave leading to Lime Tree Valley.`,
        },
        {
            flag: 'Xg',
            name: 'Goa passage',
            text: `Add a passage between East Cave and Goa Valley.  There will be an
             "ember wall" (requires water) blocking the exit.  Requires Re`,
        },
        {
            flag: 'Xw',
            name: 'Random thunder warp',
            text: `Randomize warp location for Sword of Thunder.  Instead of warping
             to Shyron, the player may instead be warped to any of the 12 towns,
             chosen randomly when the seed is rolled.  Access to that town will
             be considered "in-logic" once Sword of Thunder is acquired.`,
        },
    ],
};
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXhwZXJpbWVudGFsLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vc3JjL2pzL2ZsYWdzL2V4cGVyaW1lbnRhbC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFFQSxNQUFNLENBQUMsTUFBTSxrQkFBa0IsR0FBZ0I7SUFDN0MsT0FBTyxFQUFFLGNBQWM7SUFDdkIsTUFBTSxFQUFFLEdBQUc7SUFFWCxLQUFLLEVBQUU7UUFDTDtZQUNFLElBQUksRUFBRSxJQUFJO1lBQ1YsSUFBSSxFQUFFLGNBQWM7WUFDcEIsSUFBSSxFQUFFOzt3QkFFWTtTQUNuQjtRQUNEO1lBQ0UsSUFBSSxFQUFFLElBQUk7WUFDVixJQUFJLEVBQUUsaUJBQWlCO1lBQ3ZCLElBQUksRUFBRTs7OytFQUdtRTtTQUMxRTtRQUNEO1lBQ0UsSUFBSSxFQUFFLElBQUk7WUFDVixJQUFJLEVBQUUsYUFBYTtZQUNuQixJQUFJLEVBQUU7MkVBQytEO1NBQ3RFO1FBQ0Q7WUFDRSxJQUFJLEVBQUUsSUFBSTtZQUNWLElBQUksRUFBRSxxQkFBcUI7WUFDM0IsSUFBSSxFQUFFOzs7eUVBRzZEO1NBQ3BFO0tBQ0Y7Q0FDRixDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHtGbGFnU2VjdGlvbn0gZnJvbSAnLi9mbGFnJztcblxuZXhwb3J0IGNvbnN0IEVYUEVSSU1FTlRBTF9GTEFHUzogRmxhZ1NlY3Rpb24gPSB7XG4gIHNlY3Rpb246ICdFeHBlcmltZW50YWwnLFxuICBwcmVmaXg6ICdYJyxcblxuICBmbGFnczogW1xuICAgIHtcbiAgICAgIGZsYWc6ICdYYycsXG4gICAgICBuYW1lOiAnRXh0cmEgY2hlY2tzJyxcbiAgICAgIHRleHQ6IGBBZGQgdHdvIGV4dHJhIGNoZWNrcyBpbiB0aGUgaW5pdGlhbCBhcmVhLiAgVGhpcyByZXF1aXJlcyBSZSBhbmRcbiAgICAgICAgICAgICByZXN1bHRzIGluIGFuIGl0ZW0gb24gdGhlIHN0dWRlbnQsIGFzIHdlbGwgYXMgdHdvIGNoZXN0cyBpbiB0aGVcbiAgICAgICAgICAgICBFYXN0IENhdmUuYCxcbiAgICB9LFxuICAgIHtcbiAgICAgIGZsYWc6ICdYZScsXG4gICAgICBuYW1lOiAnRWFzdCBDYXZlIChHQkMpJyxcbiAgICAgIHRleHQ6IGBBZGQgdGhlIFwiRWFzdCBDYXZlXCIgZnJvbSB0aGUgR0JDIHZlcnNpb24uICBJZiB0aGlzIGlzIHNlbGVjdGVkXG4gICAgICAgICAgICAgdGhlbiB0aGUgaW5pdGlhbCBBbGFybSBGbHV0ZSB3aWxsIGJlIGZvdW5kIGluIGEgY2hlc3Qgb24gdGhlXG4gICAgICAgICAgICAgc2Vjb25kIGZsb29yIG9mIHRoaXMgY2F2ZS4gIElmIFJwIGlzIGFsc28gc2VsZWN0ZWQsIHRoZW4gdGhlcmVcbiAgICAgICAgICAgICB3aWxsIGJlIGEgc2Vjb25kIGV4aXQgZnJvbSB0aGlzIGNhdmUgbGVhZGluZyB0byBMaW1lIFRyZWUgVmFsbGV5LmAsXG4gICAgfSxcbiAgICB7XG4gICAgICBmbGFnOiAnWGcnLFxuICAgICAgbmFtZTogJ0dvYSBwYXNzYWdlJyxcbiAgICAgIHRleHQ6IGBBZGQgYSBwYXNzYWdlIGJldHdlZW4gRWFzdCBDYXZlIGFuZCBHb2EgVmFsbGV5LiAgVGhlcmUgd2lsbCBiZSBhblxuICAgICAgICAgICAgIFwiZW1iZXIgd2FsbFwiIChyZXF1aXJlcyB3YXRlcikgYmxvY2tpbmcgdGhlIGV4aXQuICBSZXF1aXJlcyBSZWAsXG4gICAgfSxcbiAgICB7XG4gICAgICBmbGFnOiAnWHcnLFxuICAgICAgbmFtZTogJ1JhbmRvbSB0aHVuZGVyIHdhcnAnLFxuICAgICAgdGV4dDogYFJhbmRvbWl6ZSB3YXJwIGxvY2F0aW9uIGZvciBTd29yZCBvZiBUaHVuZGVyLiAgSW5zdGVhZCBvZiB3YXJwaW5nXG4gICAgICAgICAgICAgdG8gU2h5cm9uLCB0aGUgcGxheWVyIG1heSBpbnN0ZWFkIGJlIHdhcnBlZCB0byBhbnkgb2YgdGhlIDEyIHRvd25zLFxuICAgICAgICAgICAgIGNob3NlbiByYW5kb21seSB3aGVuIHRoZSBzZWVkIGlzIHJvbGxlZC4gIEFjY2VzcyB0byB0aGF0IHRvd24gd2lsbFxuICAgICAgICAgICAgIGJlIGNvbnNpZGVyZWQgXCJpbi1sb2dpY1wiIG9uY2UgU3dvcmQgb2YgVGh1bmRlciBpcyBhY3F1aXJlZC5gLFxuICAgIH0sXG4gIF0sXG59O1xuIl19