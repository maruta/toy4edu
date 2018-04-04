var defaultCode = `
spawn({
    x0: 0,
    y0: 0,
    v0: 0,
	controller: function (v, x, t) {
        let r = 5;
        let u = 0;
		return {
			controlInput: u,
			display: v.toFixed(2)
		};
	}
});
`;
