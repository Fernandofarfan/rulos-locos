const dollars = ['oficial', 'blue', 'mep', 'ccl'];
export const ruloRoutes = [
    ...dollars.flatMap(from => dollars.filter(to => to !== from).map(to => `${from}-${to}`)),
    ...dollars.flatMap(kind => [`${kind}-usdt`, `usdt-${kind}`]),
];
