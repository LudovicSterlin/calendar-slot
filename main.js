const ICAL = require('ical');

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];	
const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
	

function *enumerate(array) {
	for (let i = 0; i < array.length; i += 1) {
	   yield [i, array[i]];
	}
}

function getICalData(filePath, url) {
	var jcalData = ICAL.parseFile(filePath); // From file
	// FIXME:2020-09-24:@LudovicSterlin: not working with url
	// var jcalData = ICAL.fromURL(STERLIN_ical_URL); // From URL

	const prodid = jcalData.prodid;
	const calname= jcalData["WR-CALNAME"];
	const caldesc =  jcalData["WR-CALDESC"];
	console.log("\nIcal data found with CALNAME:\n", calname.val, "\ncontain ", Object.keys(jcalData).length, "entries.\n");

	return jcalData;
}

function getClasess(jcalData) {
	let classes = {};
	for (key in jcalData) {
		if(key.includes("Cours") && !jcalData[key].summary.val.includes("VACANCES")) {
			classes[key] = jcalData[key];
		}
	}
	console.log("Found", Object.keys(classes).length, "classes in the year\n");
	
	return classes;
}

function groupClassesByMonthAndDay(year_classes) {
	let month_class = {};
	//  Group by month
	for (const key in year_classes) {
		if (year_classes.hasOwnProperty(key)) {
			let month_index = year_classes[key].start.getMonth();
			let month = MONTHS[month_index];
			if (!month_class.hasOwnProperty(month)) month_class[month] = {"classes": {}};;
			month_class[month].classes[key] = year_classes[key];
		}
	}
	for (month of MONTHS) {
		if (month_class.hasOwnProperty(month)) {
			console.log("Found", Object.keys(month_class[month].classes).length, "classes in", month);
		}
	}
	// Group by day
	for (month in month_class) {
		let classes = month_class[month].classes;
		let week_class = {};
		for (const key in classes) {
			if (classes.hasOwnProperty(key)) {
				let day_index = classes[key].start.getDay();
				if (!week_class.hasOwnProperty(DAYS[day_index])) week_class[DAYS[day_index]] = {};
				week_class[DAYS[day_index]][key] = classes[key];
			}
		}
		console.log("\nIn ", month, ":");
		for (const day of DAYS) {
			if (week_class.hasOwnProperty(day)) {
				console.log("\tFound", Object.keys(week_class[day]).length, "classes the", day);
			}
		}
		month_class[month].week_class = week_class;
	}

	return month_class
}

function isMorningClass(cours) {
	return cours.start.getHours() < 12 || (cours.start.getHours() === 12 && cours.start.getMinutes() < 30);
}

function displayableClassTime(classes) {
	let times = classes.map(
		value => value.start.toLocaleTimeString("fr-FR") + " -> " + value.end.toLocaleTimeString("fr-FR")
	);
	return times;
}

function displayableBusyTimes(busy_times) {
	let display = {};
	for (const key in busy_times) {
		display[key] = {};
		for (const time in busy_times[key]) {
			display[key][time] = busy_times[key][time].toLocaleTimeString("fr-FR");
		}
	}
	return display;
}

function compactBusyTimes(busy_times) {
	let local = "fr-FR";
	let am = busy_times.am.start.toLocaleTimeString(local) + "->" + busy_times.am.end.toLocaleTimeString(local);
	let pm = busy_times.pm.start ? 
		busy_times.pm.start.toLocaleTimeString(local) + "->" + busy_times.pm.end.toLocaleTimeString(local)
		: "no class";
	return am + " | " + pm;
}

function datesMin(dates) {
	return dates.reduce(function (p, v) {
		return ( compareDatesByTime(p, v) ? p : v );
	});
}

function datesMax(dates) {
	return dates.reduce(function (p, v) {
		return ( !compareDatesByTime(p, v) ? p : v );
	});
}

/**
 * @param {Date} d1 
 * @param {Date} d2 
 * @returns true if d1 < d2 as time in the day
 */
function compareDatesByTime(d1, d2){
	h1 = d1.getHours();
	m1 = d1.getMinutes();
	h2 = d2.getHours();
	m2 = d2.getMinutes();
	return h1 < h2 || (h1==h2 && m1<m2);
}

/**
 * 
 * @param {[]} classes 
 */
function classesToBusyTime(classes) {
	let busy_times = {"am": {}, "pm": {}}
	am_classes = [];
	pm_classes = [];
	for (const cours of classes) {
		if (isMorningClass(cours)) am_classes.push(cours);	
		else pm_classes.push(cours);
	}
	// Computes busy times
	if (am_classes.length > 0) {
		busy_times.am.start = datesMin(am_classes.map(cours => cours.start))
		busy_times.am.end = datesMax(am_classes.map(cours => cours.end))
	}
	if (pm_classes.length > 0) {
		busy_times.pm.start = datesMin(pm_classes.map(cours => cours.start))
		busy_times.pm.end = datesMax(pm_classes.map(cours => cours.end))
	}
	// console.log("busy_times:", displayableBusyTimes(busy_times));
	return busy_times;
}

function weekClassesToBusyTimes(week_class) {
	let week_busy_times = {};
	for (const day in week_class) {
		week_busy_times[day] = classesToBusyTime(Object.values(week_class[day]));
	}
	return week_busy_times;
}

function main() {
	// default value for LudovicSterlin calendar
	let fileName = "Edt_STERLIN";
	let STERLIN_ical_URL = "https://hyperplng.isae-supaero.fr/hp/Telechargements/ical/Edt_STERLIN.ics?version=2018.0.3.1&idICal=287CD6A66861689CA0BA23C76FB40C9A&param=643d5b312e2e36325d2666683d3126663d31";

    if(process.argv.length > 2) fileName = process.argv[2]
	const filePath = "./data/" + fileName + ".ics";

	// From file
	var jcalData = getICalData(filePath, STERLIN_ical_URL);

	let year_classes = getClasess(jcalData);
	
	// Group class by MONTHS and DAYS
	let month_class = groupClassesByMonthAndDay(year_classes);

	/* -------------------------------- Test case ------------------------------- */
	// let oct_mon = month_class['October'].week_class['Wednesday'];
	// let oct_mon_times = Object.values(oct_mon).map(
	// 	value => value.start.toLocaleTimeString("fr-FR") + " -> " + value.end.toLocaleTimeString("fr-FR")
	// 	// value => value.start.getHours() + " -> " + value.end.toLocaleTimeString("fr-FR")
	// );
	// // console.log(oct_mon);
	// console.log(oct_mon_times);
	// classesToBusyTime(Object.values(oct_mon));

	/* ------------------- Compute busy times for each month ------------------- */
	month_busy_times = {};
	for (const month in month_class) {
		month_busy_times[month] = weekClassesToBusyTimes(month_class[month].week_class);
		console.log("\nIn", month, ":")
		for (const day of DAYS) {
			if (month_busy_times[month].hasOwnProperty(day)) {
				console.log("\tBusy times on", day, (day.length-9 < 0 ? "  " : ""), "\t:", compactBusyTimes(month_busy_times[month][day]));
			}
		}
	}
	
}

main();

// first_class: {
// 	type: 'VEVENT',
// 	params: [],
// 	categories: [ 'HYPERPLANNING' ],
// 	dtstamp: 2020-09-24T10:56:00.000Z { tz: undefined },
// 	lastmodified: 2020-08-31T11:27:09.000Z { tz: undefined },
// 	uid: 'Cours-370581-6-STERLIN_Ludovic-Index-Education',
// 	start: 2020-09-02T08:00:00.000Z { tz: undefined },
// 	end: 2020-09-02T09:00:00.000Z { tz: undefined },
// 	summary: {
// 	  params: { LANGUAGE: 'fr' },
// 	  val: 'ACCUEIL DIRECTEUR GENERAL - SUPAERO - 3ème année, SUPAERO 3A Canevas V1 - RENTREE'
// 	},
// 	location: {
// 	  params: { LANGUAGE: 'fr' },
// 	  val: '05 053 Cours 2A - 25, 05 059 Cours 2A - 25, 05 133 Cours 2A - 24, 05 143 Cours 1A - 24, 05 145 Cours 1A - 24, 05 147 Cours 1A - 24, 05 149 Cours 1A - 24, Amphi 1 - 96, Amphi 3 - 95+1pmr'
// 	},
// 	description: {
// 	  params: { LANGUAGE: 'fr' },
// 	  val: 'Matière : ACCUEIL DIRECTEUR GENERAL\n' +
// 		'Salles : 05 053 Cours 2A - 25, 05 059 Cours 2A - 25, 05 133 Cours 2A - 24, 05 143 Cours 1A - 24, 05 145 Cours 1A - 24, 05 147 Cours 1A - 24, 05 149 Cours 1A - 24, Amphi 1 - 96, Amphi 3 - 95+1pmr\n' +
// 		'Promotions : SUPAERO - 3ème année, SUPAERO 3A Canevas V1\n' +
// 		'Mémo : RENTREE\n'
// 	},
// }
