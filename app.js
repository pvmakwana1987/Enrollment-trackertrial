// ===== School Enrollment Dashboard - Complete app.js with Date Saving =====

const parseDate = (dateStr) => {
    if (!dateStr) return null;
    const [year, month, day] = dateStr.split('-').map(Number);
    return new Date(year, month - 1, day);
};

const settings = {
    academicYearCutoffMonth: 8,
    academicYearCutoffDay: 31,
    classes: [
        { name: "Young Infant (0-8m)", capacity: 8, hidden: false, order: 0, minAge: 0, maxAge: 8, subdivisions: 1, subdivisionNames: {}, subdivisionCaps: {} },
        { name: "Older Infant (8-12m)", capacity: 8, hidden: false, order: 1, minAge: 8, maxAge: 12, subdivisions: 1, subdivisionNames: {}, subdivisionCaps: {} },
        { name: "Younger Toddler (12-18m)", capacity: 18, hidden: false, order: 2, minAge: 12, maxAge: 18, subdivisions: 1, subdivisionNames: {}, subdivisionCaps: {} },
        { name: "Older Toddler (18-24m)", capacity: 18, hidden: false, order: 3, minAge: 18, maxAge: 24, subdivisions: 1, subdivisionNames: {}, subdivisionCaps: {} },
        { name: "Early Preschool (2-3y)", capacity: 48, hidden: false, order: 4, subdivisions: 1, subdivisionNames: {}, subdivisionCaps: {} },
        { name: "Preschool Pathways", capacity: 16, hidden: false, order: 5, subdivisions: 1, subdivisionNames: {}, subdivisionCaps: {} },
        { name: "Preschool (3y+)", capacity: 48, hidden: false, order: 6, subdivisions: 1, subdivisionNames: {}, subdivisionCaps: {} },
        { name: "PreK (4y+)", capacity: 48, hidden: false, order: 7, subdivisions: 1, subdivisionNames: {}, subdivisionCaps: {} },
        { name: "Transitional Kindergarten", capacity: 0, hidden: false, order: 8, subdivisions: 1, subdivisionNames: {}, subdivisionCaps: {} },
        { name: "Afterschool", capacity: 10, hidden: false, order: 9, subdivisions: 1, subdivisionNames: {}, subdivisionCaps: {} },
        { name: "Graduated/Withdrawn", capacity: 0, hidden: false, order: 10, isSpecial: true },
    ]
};

let tempSettings = {};
let studentRoster = [];
let manualAssignments = {};
let waitlistedAssignments = {};
let relationshipLinks = {};
let transitionReadiness = {};
let subdivisionAssignments = {};
let classDateVisibility = {};
let manualTransitionDates = {};
let enrollmentChart;
let sortState = { key: 'dob', direction: 'asc' };
let selectedForDrag = [];
let draggedStudentSourceClass = null;

let columnOrder = {
    main: ['#', 'name', 'dob', 'class', 'transition', 'enrollDate', 'withdrawDate', 'fte', 'staff', 'promotion', 'comments', 'actions'],
    waitlist: ['#', 'name', 'dob', 'waitlistedFor', 'enrollDate', 'fte', 'promotion', 'staff', 'comments', 'actions'],
    graduated: ['#', 'name', 'dob', 'withdrawDate', 'fte', 'staff', 'promotion', 'comments', 'actions']
};

Chart.register(ChartDataLabels);

// ===== NEW: Load and save projection date =====
document.addEventListener('DOMContentLoaded', async () => {
    await new Promise(resolve => setTimeout(resolve, 100));
    
    try {
        const snapshot = await database.ref('settings/projectionDate').once('value');
        const savedDate = snapshot.val();
        
        if (savedDate) {
            document.getElementById('currentDate').value = savedDate;
        } else {
            const today = new Date().toISOString().split('T')[0];
            document.getElementById('currentDate').value = today;
        }
    } catch (error) {
        const today = new Date().toISOString().split('T')[0];
        document.getElementById('currentDate').value = today;
    }
});

const deepClone = (obj) => JSON.parse(JSON.stringify(obj));

const loadData = async () => {
    try {
        console.log('Loading data from Firebase...');
        const snapshot = await database.ref('schoolEnrollmentData').once('value');
        const data = snapshot.val();
        
        if (data) {
            studentRoster = data.roster || [];
            manualAssignments = data.assignments || {};
            waitlistedAssignments = data.waitlisted || {};
            relationshipLinks = data.relationships || data.siblings || {};
            transitionReadiness = data.readiness || {};
            subdivisionAssignments = data.subdivisions || {};
            classDateVisibility = data.dateVisibility || {};
            manualTransitionDates = data.manualTransitions || {};
            
            if(data.columnOrder) {
                Object.keys(columnOrder).forEach(key => {
                    const defaultKeys = new Set(columnOrder[key]);
                    const savedKeys = new Set(data.columnOrder[key]);
                    const missingKeys = [...defaultKeys].filter(x => !savedKeys.has(x));
                    if(missingKeys.length > 0) {
                        data.columnOrder[key].push(...missingKeys);
                    }
                });
                columnOrder = data.columnOrder;
            }
            
            if (data.classSettings) {
                settings.classes = data.classSettings;
            }
            
            console.log('Data loaded successfully!');
        } else {
            console.log('No existing data found, starting fresh');
            studentRoster = [];
            manualAssignments = {};
            waitlistedAssignments = {};
            relationshipLinks = {};
            transitionReadiness = {};
            subdivisionAssignments = {};
            classDateVisibility = {};
            manualTransitionDates = {};
        }
    } catch (error) {
        console.error('Error loading data:', error);
        alert('Error loading data from Firebase. Please check your internet connection.');
        studentRoster = [];
        manualAssignments = {};
        waitlistedAssignments = {};
        relationshipLinks = {};
        transitionReadiness = {};
        subdivisionAssignments = {};
        classDateVisibility = {};
        manualTransitionDates = {};
    }
    tempSettings = deepClone(settings);
};

const saveData = async () => {
    try {
        const dataToSave = {
            roster: studentRoster,
            assignments: manualAssignments,
            waitlisted: waitlistedAssignments,
            relationships: relationshipLinks,
            readiness: transitionReadiness,
            subdivisions: subdivisionAssignments,
            dateVisibility: classDateVisibility,
            classSettings: settings.classes,
            columnOrder: columnOrder,
            manualTransitions: manualTransitionDates
        };
        
        await database.ref('schoolEnrollmentData').set(dataToSave);
        console.log('Data saved successfully!');
    } catch (error) {
        console.error('Error saving data:', error);
        alert('Failed to save data to Firebase. Please check your internet connection.');
    }
};

const renderCapacitySettings = () => {
    const container = document.getElementById('capacitySettingsContainer');
    container.innerHTML = '';

    const header = document.createElement('div');
    header.className = 'grid grid-cols-[3fr_1fr_1fr_2fr_auto] gap-x-4 p-2 border-b font-semibold text-gray-500 text-sm bg-gray-50';
    header.innerHTML = `
        <span>Class Name</span>
        <span class="text-center">Capacity</span>
        <span class="text-center">Subdivisions</span>
        <span class="text-center">Age Range (Months)</span>
        <span class="text-center">Visible</span>
    `;
    container.appendChild(header);

    tempSettings.classes.sort((a, b) => a.order - b.order).forEach((cls) => {
        const row = document.createElement('div');
        row.className = `grid grid-cols-[3fr_1fr_1fr_2fr_auto] gap-x-4 p-2 border-b items-center ${cls.hidden ? 'bg-gray-50' : 'bg-white'}`;
        const classId = cls.name.replace(/[^a-zA-Z0-9]/g, '-');
        
        let cells = `<span class="font-medium text-gray-700">${cls.name}</span>`;

        if (cls.isSpecial) {
            cells += `<span></span><span></span><span></span>`;
        } else {
            let ageRangeInputs = '<div></div>';
            const classOrderIndex = settings.classes.filter(c => !c.isSpecial).findIndex(c => c.name === cls.name);
            
            if (classOrderIndex !== -1 && classOrderIndex <= 3) {
                 ageRangeInputs = `
                    <div class="flex items-center space-x-2 justify-center">
                       <input type="number" placeholder="Min" value="${cls.minAge ?? ''}" data-class-name="${cls.name}" data-age-type="min" class="age-range-input inline-input w-16 text-center">
                       <span class="text-gray-500">-</span>
                       <input type="number" placeholder="Max" value="${cls.maxAge ?? ''}" data-class-name="${cls.name}" data-age-type="max" class="age-range-input inline-input w-16 text-center">
                    </div>
                `;
            }
            cells += `
                <div class="text-center"><input type="number" id="capacity-${classId}" value="${cls.capacity}" data-class-name="${cls.name}" class="capacity-input inline-input w-20 text-center"></div>
                <div class="text-center"><input type="number" value="${cls.subdivisions || 1}" min="1" max="4" data-class-name="${cls.name}" class="subdivision-input inline-input w-20 text-center"></div>
                ${ageRangeInputs}
            `;
        }

        cells += `
            <div class="flex justify-center">
                <div class="relative inline-block w-10 align-middle select-none transition duration-200 ease-in">
                    <input type="checkbox" name="toggle" id="toggle-${classId}" class="toggle-checkbox absolute block w-6 h-6 rounded-full bg-white border-4 appearance-none cursor-pointer" data-class-name="${cls.name}" ${!cls.hidden ? 'checked' : ''}/>
                    <label for="toggle-${classId}" class="toggle-label block overflow-hidden h-6 rounded-full bg-gray-300 cursor-pointer"></label>
                </div>
            </div>`;
        
        row.innerHTML = cells;
        container.appendChild(row);
    });

    document.querySelectorAll('.capacity-input, .subdivision-input, .age-range-input, .toggle-checkbox').forEach(input => {
        const eventType = input.type === 'checkbox' ? 'change' : 'input';
        input.addEventListener(eventType, (e) => {
            const className = e.target.getAttribute('data-class-name');
            const classToUpdate = tempSettings.classes.find(c => c.name === className);
            if (!classToUpdate) return;

            if (e.target.classList.contains('capacity-input')) {
                const newCapacity = parseInt(e.target.value, 10);
                if (!isNaN(newCapacity)) classToUpdate.capacity = newCapacity;
            } else if (e.target.classList.contains('subdivision-input')) {
                const subdivisionCount = parseInt(e.target.value, 10);
                if (!isNaN(subdivisionCount) && subdivisionCount >= 1 && subdivisionCount <= 4) classToUpdate.subdivisions = subdivisionCount;
            } else if (e.target.classList.contains('age-range-input')) {
                const ageType = e.target.getAttribute('data-age-type');
                const value = e.target.value === '' ? null : parseInt(e.target.value, 10);
                if(ageType === 'min') classToUpdate.minAge = value;
                if(ageType === 'max') classToUpdate.maxAge = value;
            } else if (e.target.classList.contains('toggle-checkbox')) {
                classToUpdate.hidden = !e.target.checked;
                const parentRow = e.target.closest('.grid');
                if (parentRow) parentRow.classList.toggle('bg-gray-50', classToUpdate.hidden);
            }
        });
    });
};

document.getElementById('applySettingsBtn').addEventListener('click', () => {
    settings.classes = deepClone(tempSettings.classes);
    saveData();
    updateDashboard();
});

const dateDiffInMonths = (d1, d2) => {
    let months;
    months = (d2.getFullYear() - d1.getFullYear()) * 12;
    months -= d1.getMonth();
    months += d2.getMonth();
    return months <= 0 ? 0 : months;
};

const dateDiffInYears = (d1, d2) => {
    if (d1 > d2) return 0;
    let age = d2.getFullYear() - d1.getFullYear();
    const m = d2.getMonth() - d1.getMonth();
    if (m < 0 || (m === 0 && d2.getDate() < d1.getDate())) {
        age--;
    }
    return age < 0 ? 0 : age;
};

const getAgeAtAcademicCutoff = (dob, projectionDate) => {
    const dobDate = parseDate(dob);
    const projDate = parseDate(projectionDate);
    const yearOfCutoff = projDate.getMonth() + 1 < settings.academicYearCutoffMonth ? projDate.getFullYear() - 1 : projDate.getFullYear();
    const cutoffDate = new Date(yearOfCutoff, settings.academicYearCutoffMonth - 1, settings.academicYearCutoffDay);
    return dateDiffInYears(dobDate, cutoffDate);
};

const getAutomaticStudentClassBasedOnAge = (student, projectionDate) => {
    const dobDate = parseDate(student.dob);
    const projDate = parseDate(projectionDate);
    const ageInMonths = dateDiffInMonths(dobDate, projDate);
    const ageAtCutoff = getAgeAtAcademicCutoff(student.dob, projectionDate);
    
    const sortedClasses = [...settings.classes].filter(c => !c.isSpecial).sort((a,b) => a.order - b.order);

    for(const cls of sortedClasses) {
         if (cls && cls.minAge != null && cls.maxAge != null && ageInMonths >= cls.minAge && ageInMonths < cls.maxAge) {
            return cls.name;
        }
    }

    const classPreK = settings.classes.find(c=>c.name.startsWith("PreK"));
    const classPreschool = settings.classes.find(c=>c.name.startsWith("Preschool (3y+)"));
    const classEarlyPreschool = settings.classes.find(c=>c.name.startsWith("Early Preschool"));

    if (ageAtCutoff >= 5) return "Graduated/Withdrawn";
    if (ageAtCutoff >= 4) return classPreK.name;
    if (ageAtCutoff >= 3) return classPreschool.name;
    if (ageInMonths >= 24) return classEarlyPreschool.name;
    
    const classOlderToddler = settings.classes.find(c => c.name.startsWith("Older Toddler"));
    const classYoungerToddler = settings.classes.find(c => c.name.startsWith("Younger Toddler"));
    const classOlderInfant = settings.classes.find(c => c.name.startsWith("Older Infant"));
    const classYoungInfant = settings.classes.find(c => c.name.startsWith("Young Infant"));
    
    if (ageInMonths >= 18) return classOlderToddler.name;
    if (ageInMonths >= 12) return classYoungerToddler.name;
    if (ageInMonths >= 8) return classOlderInfant.name;
    return classYoungInfant.name;
};

const getNextClass = (currentClassName) => {
    const sortedClasses = settings.classes.filter(c => !c.isSpecial).sort((a,b) => a.order - b.order);
    const currentIndex = sortedClasses.findIndex(c => c.name === currentClassName);
    if (currentIndex > -1 && currentIndex < sortedClasses.length - 1) {
        return sortedClasses[currentIndex + 1].name;
    }
    return "Graduated/Withdrawn";
};

const getStudentClass = (student, projectionDate) => {
    if (student.withdrawalDate && parseDate(student.withdrawalDate) <= parseDate(projectionDate)) {
        return "Graduated/Withdrawn";
    }
    if (manualAssignments[student.id]) {
        const assignedClass = settings.classes.find(c => c.name === manualAssignments[student.id]);
        if(assignedClass && !assignedClass.hidden) {
            return manualAssignments[student.id];
        }
    }
    const manualDate = manualTransitionDates[student.id];
    if (manualDate && parseDate(projectionDate) >= parseDate(manualDate)) {
        let tempDate = parseDate(manualDate);
        tempDate.setDate(tempDate.getDate() - 1);
        const dateBeforeTransition = tempDate.toISOString().split('T')[0];
        const classBeforeTransition = getAutomaticStudentClassBasedOnAge(student, dateBeforeTransition);
        return getNextClass(classBeforeTransition);
    }
    return getAutomaticStudentClassBasedOnAge(student, projectionDate);
};

const isWaitlisted = (student, className, currentDate) => {
    if (waitlistedAssignments[student.id] === className) {
        return true;
    }
    if (student.enrollmentDate && parseDate(student.enrollmentDate) > parseDate(currentDate)) {
        return getStudentClass(student, currentDate) === className;
    }
    return false;
};

const getNextTransitionDate = (dob, currentClass, studentId) => {
    if (manualTransitionDates[studentId]) {
        return parseDate(manualTransitionDates[studentId]);
    }

    const dobDate = parseDate(dob);
    if (currentClass === "Graduated/Withdrawn") return "N/A";
    
    const getAcademicTransitionDate = (targetAge) => {
        const targetYear = dobDate.getFullYear() + targetAge;
        const cutoffInTargetYear = new Date(targetYear, settings.academicYearCutoffMonth - 1, settings.academicYearCutoffDay);
        if (new Date(targetYear, dobDate.getMonth(), dobDate.getDate()) <= cutoffInTargetYear) {
            return cutoffInTargetYear;
        }
        return new Date(targetYear + 1, settings.academicYearCutoffMonth - 1, settings.academicYearCutoffDay);
    };

    const classConfig = settings.classes.find(c => c.name === currentClass);
    if (!classConfig) return "N/A";
    
    const sortedClasses = [...settings.classes].sort((a,b) => a.order - b.order);
     for(let i = 0; i <= 3; i++) {
        const cls = sortedClasses[i];
        if (cls.name === currentClass && cls.maxAge != null) {
           return new Date(new Date(dob).setMonth(new Date(dob).getMonth() + cls.maxAge));
        }
    }

    if (classConfig.name.startsWith("Early Preschool")) return getAcademicTransitionDate(3);
    if (classConfig.name.startsWith("Preschool Pathways")) return getAcademicTransitionDate(3);
    if (classConfig.name.startsWith("Preschool (3y+)")) return getAcademicTransitionDate(4);
    if (classConfig.name.startsWith("PreK")) return getAcademicTransitionDate(5);
    if (classConfig.name.startsWith("Transitional Kindergarten")) return "N/A";
    if (classConfig.name.startsWith("Afterschool")) return "N/A";
    
    return "N/A";
};

const updateDashboard = () => {
    const currentDate = document.getElementById('currentDate').value;
    const visibleClasses = settings.classes.filter(c => !c.hidden && !c.isSpecial);
    
    let totalEnrollment = 0;
    let totalCapacity = 0;
    let totalFTE = 0;
    const activeStudents = studentRoster.filter(s => getStudentClass(s, currentDate) !== 'Graduated/Withdrawn');

    const classEnrollments = visibleClasses.map(c => {
        const studentsInClass = activeStudents.filter(s => getStudentClass(s, currentDate) === c.name);
        const enrolledStudents = studentsInClass.filter(s => !isWaitlisted(s, c.name, currentDate));
        const waitlistedCount = studentsInClass.length - enrolledStudents.length;

        const classFTE = enrolledStudents.reduce((sum, s) => sum + (s.fte === 0 ? 0 : (s.fte || 1)), 0);
        totalFTE += classFTE;

        totalEnrollment += enrolledStudents.length;
        totalCapacity += c.capacity;

        return {
            name: c.name,
            enrolled: enrolledStudents.length,
            waitlisted: waitlistedCount,
            capacity: c.capacity
        };
    });

    document.getElementById('totalEnrollment').textContent = totalEnrollment;
    document.getElementById('totalFTE').textContent = totalFTE.toFixed(2);
    document.getElementById('totalVacancies').textContent = totalCapacity - totalEnrollment;

    updateEnrollmentChart(classEnrollments);
    updateRosterTable(currentDate);
    updateIndividualRosters(currentDate);
    updateWaitlistedRoster(currentDate);
    updateGraduatedRoster(currentDate);
    updateDeleteButtonsState();
};

const updateEnrollmentChart = (data) => {
    const container = document.getElementById('enrollment-bar-container');
    container.innerHTML = '';

    const filteredData = data.filter(cls => !settings.classes.find(c => c.name === cls.name)?.isSpecial);

    filteredData.forEach(cls => {
        const enrolledPercent = cls.capacity > 0 ? (cls.enrolled / cls.capacity) * 100 : 0;
        
        const barWrapper = document.createElement('div');
        barWrapper.className = 'flex flex-col items-center flex-1 h-full max-w-24';

        const waitlistInfo = document.createElement('p');
        waitlistInfo.className = 'text-sm font-semibold text-red-600 mb-1 h-6';
        waitlistInfo.innerHTML = `+${cls.waitlisted} <span class="font-normal">Waitlisted</span>`;

        const numbers = document.createElement('p');
        numbers.className = 'font-bold text-sm mb-1 text-center';
        numbers.textContent = `${cls.enrolled} / ${cls.capacity}`;

        const barContent = document.createElement('div');
        barContent.className = 'w-full flex-1 bg-green-200 rounded-lg overflow-hidden flex flex-col justify-end';
        
        const enrolledBar = document.createElement('div');
        enrolledBar.className = 'w-full bg-green-600';
        enrolledBar.style.height = `${enrolledPercent}%`;

        barContent.appendChild(enrolledBar);

        const label = document.createElement('p');
        label.className = 'text-xs text-center text-gray-600 mt-2 h-12 flex items-start justify-center';
        label.textContent = cls.name;

        barWrapper.appendChild(waitlistInfo);
        barWrapper.appendChild(numbers);
        barWrapper.appendChild(barContent);
        barWrapper.appendChild(label);
        container.appendChild(barWrapper);
    });
};

const getColumnRenderers = (currentDate) => ({
    '#': {
        header: () => `<th class="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">#</th>`,
        cell: (student, index, data) => `<td class="px-2 py-2 whitespace-nowrap text-sm text-gray-500">${data.isWaitlisted ? '' : index + 1}</td>`
    },
    'name': {
        header: () => `<th data-column-key="name" class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name<div class="resizer"></div></th>`,
        cell: (student, index, data) => {
            const {manualAssignmentIndicator, waitlistIndicator, relationshipIndicator} = data;
            return `<td class="px-4 py-2 whitespace-nowrap text-sm font-medium text-gray-900">${student.name} ${relationshipIndicator}${manualAssignmentIndicator}${waitlistIndicator}</td>`;
        }
    },
    'dob': {
        header: () => `<th data-column-key="dob" class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider sortable-header" data-sort-key="dob">DOB<div class="resizer"></div></th>`,
        cell: (student) => `<td class="px-4 py-2 whitespace-nowrap text-sm text-gray-500">${parseDate(student.dob).toLocaleDateString()}</td>`
    },
    'class': {
        header: () => `<th data-column-key="class" class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider sortable-header" data-sort-key="class">Class<div class="resizer"></div></th>`,
        cell: (student, index, data) => `<td class="px-4 py-2 whitespace-nowrap text-sm text-gray-500">${data.currentClass}</td>`
    },
    'transition': {
        header: () => `<th data-column-key="transition" class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Transition<div class="resizer"></div></th>`,
        cell: (student, index, data) => {
            const transitionDate = getNextTransitionDate(student.dob, data.currentClass, student.id);
            const dateValue = transitionDate instanceof Date ? transitionDate.toISOString().split('T')[0] : '';
            const isDisabled = data.currentClass === 'Graduated/Withdrawn';
            if (isDisabled) {
                return `<td class="px-4 py-2 whitespace-nowrap text-sm text-gray-500">${transitionDate instanceof Date ? transitionDate.toLocaleDateString() : 'N/A'}</td>`;
            }
            return `<td class="px-4 py-2 whitespace-nowrap text-sm text-gray-500 w-36"><input type="date" class="inline-input transition-date-input" value="${dateValue}" data-student-id="${student.id}"></td>`;
        }
    },
    'enrollDate': {
        header: () => `<th data-column-key="enrollDate" class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Enroll Date<div class="resizer"></div></th>`,
        cell: (student) => `<td class="px-4 py-2 whitespace-nowrap text-sm text-gray-500 w-24"><input type="date" class="inline-input enrollment-date-input" value="${student.enrollmentDate || ''}" data-student-id="${student.id}"></td>`
    },
    'withdrawDate': {
        header: () => `<th data-column-key="withdrawDate" class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Withdraw Date<div class="resizer"></div></th>`,
        cell: (student) => `<td class="px-4 py-2 whitespace-nowrap text-sm text-gray-500 w-24"><input type="date" class="inline-input withdrawal-date-input" value="${student.withdrawalDate || ''}" data-student-id="${student.id}"></td>`
    },
    'fte': {
        header: () => `<th data-column-key="fte" class="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">FTE<div class="resizer"></div></th>`,
        cell: (student) => `<td class="px-2 py-2 whitespace-nowrap text-sm text-gray-500 w-20"><input type="number" class="inline-input fte-input" min="0" max="1" step="0.1" value="${student.fte ?? 1}" data-student-id="${student.id}"></td>`
    },
    'staff': {
        header: () => `<th data-column-key="staff" class="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Staff<div class="resizer"></div></th>`,
        cell: (student) => `<td class="px-2 py-2 whitespace-nowrap text-sm text-gray-500 text-center"><input type="checkbox" class="staff-checkbox rounded" data-student-id="${student.id}" ${student.isStaffChild ? 'checked' : ''}></td>`
    },
    'promotion': {
        header: () => `<th data-column-key="promotion" class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Promotion<div class="resizer"></div></th>`,
        cell: (student, index, data) => {
            const {hasPartner} = data;
            return `<td class="px-4 py-2 whitespace-nowrap text-sm text-gray-500 w-32">
                 <div class="flex items-center space-x-2">
                    <input type="checkbox" class="partner-checkbox rounded" data-student-id="${student.id}" ${hasPartner ? 'checked' : ''}>
                    <input type="text" class="inline-input partner-text-input ${hasPartner ? '' : 'hidden'}" value="${student.partner || ''}" data-student-id="${student.id}">
                </div>
            </td>`;
        }
    },
    'comments': {
        header: () => `<th data-column-key="comments" class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Comments<div class="resizer"></div></th>`,
        cell: (student) => `<td class="px-4 py-2 whitespace-nowrap text-sm text-gray-500 w-48"><input type="text" class="inline-input comments-input" value="${student.comments || ''}" data-student-id="${student.id}"></td>`
    },
    'actions': {
        header: () => `<th data-column-key="actions" class="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>`,
        cell: (student) => `<td class="px-4 py-2 whitespace-nowrap text-right text-sm font-medium space-x-2">
                <button class="text-blue-600 hover:text-blue-800 link-sibling-btn" data-student-id="${student.id}">Relationship</button>
                <button class="text-amber-600 hover:text-amber-800 edit-student-btn" data-student-id="${student.id}">Edit</button>
                <button class="text-red-600 hover:text-red-800 delete-student-btn" data-student-id="${student.id}">Delete</button>
            </td>`
    },
    'waitlistedFor': {
        header: () => `<th data-column-key="waitlistedFor" class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Waitlisted For<div class="resizer"></div></th>`,
        cell: (student) => {
            const waitlistedForClass = waitlistedAssignments[student.id] || getStudentClass(student, currentDate);
            return `<td class="px-4 py-2 whitespace-nowrap text-sm text-gray-500">${waitlistedForClass}</td>`;
        }
    }
});

const renderTable = (tableKey, containerId, headerRowId, data) => {
    const renderers = getColumnRenderers(document.getElementById('currentDate').value);
    const order = columnOrder[tableKey];
    
    const headerRow = document.getElementById(headerRowId);
    headerRow.innerHTML = '';
    
    if (tableKey === 'main') {
         headerRow.innerHTML += `<th class="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"><input type="checkbox" id="selectAllCheckbox" class="rounded"></th>`;
    }

    order.forEach(key => {
        if (renderers[key]) {
            headerRow.innerHTML += renderers[key].header();
        }
    });

    const tableBody = document.getElementById(containerId);
    tableBody.innerHTML = '';

    if (data.length === 0) {
         const colspan = headerRow.children.length;
         tableBody.innerHTML = `<tr><td colspan="${colspan}" class="text-center py-4 text-gray-500">No students found.</td></tr>`;
         return;
    }

    data.forEach((student, index) => {
        const row = document.createElement('tr');
        
        let rowHtml = '';
         if (tableKey === 'main') {
            rowHtml += `<td class="px-2 py-2 whitespace-nowrap text-sm text-gray-500"><input type="checkbox" class="student-checkbox rounded" data-student-id="${student.id}"></td>`;
        }
        const studentClass = getStudentClass(student, document.getElementById('currentDate').value);
        const transitionDate = getNextTransitionDate(student.dob, studentClass, student.id);

        const transitionDateStr = transitionDate instanceof Date ? transitionDate.toLocaleDateString() : transitionDate;
        const manualAssignmentIndicator = manualAssignments[student.id] ? ' *' : '';
        const waitlistIndicator = student.isWaitlisted ? ' (W)' : '';
        const hasRelationships = relationshipLinks[student.id] && relationshipLinks[student.id].length > 0;
        let relationshipIndicator = '';
        if(hasRelationships) {
            const relTypes = student.isWaitlisted ? '' : relationshipLinks[student.id].map(r => {
                if (r.type === 'S') return '👨‍👩‍👧‍👦';
                if (r.type === 'F') return '🤝';
                return '';
            }).join(' ');
            relationshipIndicator = relTypes;
        }
        const cellData = {
            ...student,
            currentClass: studentClass,
            transitionDateStr: transitionDateStr,
            manualAssignmentIndicator,
            waitlistIndicator,
            relationshipIndicator,
            hasPartner: student.partner && student.partner.length > 0
        };

        order.forEach(key => {
            if (renderers[key]) {
                 rowHtml += renderers[key].cell(student, index, cellData);
            }
        });
        row.innerHTML = rowHtml;
        tableBody.appendChild(row);
    });
};

const updateRosterTable = (currentDate) => {
    const allStudents = studentRoster.map(student => ({
        ...student,
        isWaitlisted: isWaitlisted(student, getStudentClass(student, currentDate), currentDate)
    })).filter(s => getStudentClass(s, currentDate) !== "Graduated/Withdrawn");
    
    const enrolled = allStudents.filter(s => !s.isWaitlisted).sort((a,b) => parseDate(a.dob) - parseDate(b.dob));
    const waitlisted = allStudents.filter(s => s.isWaitlisted).sort((a,b) => parseDate(a.dob) - parseDate(b.dob));

    const combinedRoster = [...enrolled, ...waitlisted];
    renderTable('main', 'rosterTableBody', 'mainRosterTheadRow', combinedRoster);
    createResizableTable(document.getElementById('mainRosterTable'));
    
    const selectAllCheckbox = document.getElementById('selectAllCheckbox');
    if (selectAllCheckbox) {
        selectAllCheckbox.addEventListener('change', (e) => {
            const rosterTableBody = document.getElementById('rosterTableBody');
            const checkboxes = rosterTableBody.querySelectorAll('.student-checkbox');
            checkboxes.forEach(checkbox => {
                checkbox.checked = e.target.checked;
            });
            updateDeleteButtonsState();
        });
    }
};

const updateWaitlistedRoster = (currentDate) => {
    const waitlistedStudents = studentRoster.filter(s => isWaitlisted(s, getStudentClass(s, currentDate), currentDate) && getStudentClass(s, currentDate) !== 'Graduated/Withdrawn');
    renderTable('waitlist', 'waitlistTableBody', 'waitlistRosterTheadRow', waitlistedStudents);
    createResizableTable(document.getElementById('waitlistRosterTable'));
};

const updateGraduatedRoster = (currentDate) => {
    const graduatedStudents = studentRoster.filter(s => getStudentClass(s, currentDate) === 'Graduated/Withdrawn');
    renderTable('graduated', 'graduatedTableBody', 'graduatedRosterTheadRow', graduatedStudents);
    createResizableTable(document.getElementById('graduatedRosterTable'));
};

const updateIndividualRosters = (currentDate) => {
    const container = document.getElementById('individualRostersContainer');
    container.innerHTML = ''; 
    const visibleClasses = settings.classes.filter(c => !c.hidden).sort((a,b) => a.order - b.order);

    visibleClasses.forEach(cls => {
        const subdivisionCount = cls.subdivisions || 1;
        const isHorizontalLayout = cls.order >= 4 && subdivisionCount > 1;
        let cardSpanClass = '';
         if (isHorizontalLayout) {
            const span = Math.min(1 + subdivisionCount, 4);
            cardSpanClass = `lg:col-span-${span}`;
        }

        const classCard = document.createElement('div');
        classCard.className = `bg-white p-4 rounded-xl shadow-md border border-gray-200 flex flex-col class-roster-card ${cardSpanClass}`;
        classCard.dataset.className = cls.name;
        
        const studentsInClass = studentRoster.filter(s => getStudentClass(s, currentDate) === cls.name);
        
        Object.keys(transitionReadiness).forEach(studentId => {
            const readyInfo = transitionReadiness[studentId];
            const student = studentRoster.find(s => s.id === studentId);
            if (student && readyInfo.fromClass !== getStudentClass(student, currentDate)) {
                delete transitionReadiness[studentId];
                saveData();
            }
        });

        const allEnrolledStudents = studentsInClass.filter(s => !isWaitlisted(s, cls.name, currentDate));
        const waitlistedStudents = studentsInClass.filter(s => isWaitlisted(s, cls.name, currentDate));
        
        const createStudentList = (students) => {
             const studentsWithDates = students.map(s => {
                 const naturalTransitionDate = getNextTransitionDate(s.dob, cls.name, s.id);
                 let effectiveDate = naturalTransitionDate;
                 let isSpecial = false;
                 
                 if(s.withdrawalDate && cls.name === "Graduated/Withdrawn") {
                     effectiveDate = parseDate(s.withdrawalDate);
                     isSpecial = true;
                 } else if (s.withdrawalDate) {
                    const withdrawalD = parseDate(s.withdrawalDate);
                     if (!(effectiveDate instanceof Date) || withdrawalD < effectiveDate) {
                        effectiveDate = withdrawalD;
                        isSpecial = true;
                     }
                 }
                 if (s.enrollmentDate && parseDate(s.enrollmentDate) > parseDate(currentDate)) {
                     const enrollmentD = parseDate(s.enrollmentDate);
                     if (!(effectiveDate instanceof Date) || enrollmentD < effectiveDate) {
                        effectiveDate = enrollmentD;
                        isSpecial = true;
                     }
                 }

                 return {
                    ...s,
                    effectiveDate,
                    isSpecialDate: isSpecial
                 }
            });

            studentsWithDates.sort((a, b) => {
                const dateA = a.effectiveDate instanceof Date ? a.effectiveDate.getTime() : Infinity;
                const dateB = b.effectiveDate instanceof Date ? b.effectiveDate.getTime() : Infinity;
                return dateA - dateB;
            });
            
            let listHtml = '<ul class="space-y-1 mt-2 multi-column-list">';
            if (studentsWithDates.length > 0) {
                studentsWithDates.forEach((student, index) => {
                    const displayDateStr = student.effectiveDate instanceof Date 
                        ? student.isSpecialDate
                            ? `(${student.effectiveDate.toLocaleDateString()})`
                            : student.effectiveDate.toLocaleDateString()
                        : student.effectiveDate;

                    const relations = relationshipLinks[student.id];
                    const hasRelationships = relations && relations.length > 0;
                    
                    const relationshipTooltip = hasRelationships ? `title="${relations.map(r => { 
                        const peer = studentRoster.find(s => s.id === r.id); 
                        if (!peer) return '';
                        return `${r.type === 'S' ? 'Sibling' : 'Friend'}: ${peer.name} (${getStudentClass(peer, currentDate)})`
                    }).filter(Boolean).join(', ')}"` : '';
                    
                    const relationshipIcon = hasRelationships ? relations.map(r => {
                        if (r.type === 'S') return '👨‍👩‍👧‍👦';
                        if (r.type === 'F') return '🤝';
                        return '';
                    }).join(' ') : '';

                    const staffIcon = student.isStaffChild ? '&#x1F469;&#x200D;&#x1F3EB;' : '';
                    const isReady = transitionReadiness[student.id] && transitionReadiness[student.id].fromClass === cls.name;
                    const readyClass = isReady ? 'ready-for-transition' : 'bg-gray-50';
                    const nameHighlightClass = student.isSpecialDate ? 'font-bold' : '';

                    listHtml += `
                        <li class="flex justify-between items-center text-sm text-gray-700 p-2 rounded-md roster-item ${readyClass} roster-item-container" draggable="true" data-student-id="${student.id}" ${relationshipTooltip}>
                            <div class="flex items-center">
                                <input type="checkbox" class="ready-checkbox rounded mr-2 ${cls.isSpecial ? 'hidden' : ''}" data-student-id="${student.id}" ${isReady ? 'checked' : ''}>
                                <span class="${hasRelationships ? 'sibling-highlight' : ''} ${nameHighlightClass}"><span class="font-semibold text-gray-500 mr-1">${index + 1}.</span> ${student.name} ${relationshipIcon} ${staffIcon}</span>
                            </div>
                            <span class="text-xs text-gray-500 transition-date-span ${classDateVisibility[cls.name] ? '' : 'hidden'}">${displayDateStr}</span>
                        </li>`;
                });
            } else {
                listHtml += '<li class="text-xs text-gray-400 p-2 col-span-full">No students.</li>';
            }
            return listHtml + '</ul>';
        };

        const mainEnrolled = allEnrolledStudents.filter(s => ! (subdivisionAssignments[s.id] && subdivisionAssignments[s.id].className === cls.name));
        
        let subdivisionsHtml = '';
        if(subdivisionCount > 1) {
            for(let i = 0; i < subdivisionCount; i++) {
                const subdivisionStudents = allEnrolledStudents.filter(s => subdivisionAssignments[s.id] && subdivisionAssignments[s.id].className === cls.name && subdivisionAssignments[s.id].index === i);
                const subdivisionName = (cls.subdivisionNames && cls.subdivisionNames[i]) || '';
                const subCap = (cls.subdivisionCaps && cls.subdivisionCaps[i]) || '';
                subdivisionsHtml += `
                     <div class="mt-4 flex-1">
                        <input type="text" class="subdivision-name-input inline-input text-sm font-semibold" placeholder="Subdivision ${i+1} Name" value="${subdivisionName}" data-class-name="${cls.name}" data-index="${i}">
                        <div class="text-xs text-center my-1">
                            <span>${subdivisionStudents.length} / </span>
                            <input type="number" class="inline-input w-12 text-center p-0 subdivision-cap-input" value="${subCap}" placeholder="Cap" data-class-name="${cls.name}" data-index="${i}">
                        </div>
                        <div class="drop-zone p-2 rounded-md border border-dashed border-gray-300" data-section="subdivision" data-index="${i}">
                            ${createStudentList(subdivisionStudents)}
                        </div>
                    </div>
                `;
            }
        }

        const enrolledHtml = `
            <div>
                <h4 class="text-sm font-semibold text-gray-600 mt-2">Enrolled</h4>
                <div class="drop-zone p-2 rounded-md" data-section="enrolled">
                    ${createStudentList(mainEnrolled)}
                </div>
            </div>`;

        const waitlistedHtml = `
            <div class="mt-4">
                <h4 class="text-sm font-semibold text-gray-600">Waitlisted</h4>
                <div class="drop-zone p-2 rounded-md" data-section="waitlisted">
                    ${createStudentList(waitlistedStudents)}
                </div>
            </div>`;

        let cardContentHtml = '';

        if (isHorizontalLayout) {
            cardContentHtml = `
                <div class="collapsible-content flex flex-col lg:flex-row">
                    <div class="flex-1">
                        ${cls.isSpecial ? '' : enrolledHtml}
                        ${cls.isSpecial ? `<div class="drop-zone p-2 rounded-md" data-section="enrolled">${createStudentList(studentsInClass)}</div>` : waitlistedHtml}
                    </div>
                    <div class="lg:ml-4 mt-4 lg:mt-0 flex-1 lg:border-l lg:pl-4 border-gray-200 flex flex-col lg:flex-row lg:space-x-4">
                        ${subdivisionsHtml}
                    </div>
                </div>`;
        } else {
            cardContentHtml = `
                <div class="collapsible-content">
                     ${cls.isSpecial ? `<div class="drop-zone p-2 rounded-md" data-section="enrolled">${createStudentList(studentsInClass)}</div>` : enrolledHtml + waitlistedHtml}
                    ${subdivisionsHtml}
                </div>`;
        }

        classCard.innerHTML = `
            <div class="collapsible-trigger-card flex justify-between items-center cursor-pointer class-roster-card-header">
                <h3 class="text-lg font-semibold text-gray-800 text-center">${cls.name}</h3>
                 <div class="flex items-center text-xs">
                    <label for="date-toggle-${cls.name.replace(/[^a-zA-Z0-9]/g, '-')}" class="mr-2 text-gray-600">Show Dates:</label>
                    <div class="relative inline-block w-8 align-middle select-none transition duration-200 ease-in">
                        <input type="checkbox" name="date-toggle" id="date-toggle-${cls.name.replace(/[^a-zA-Z0-9]/g, '-')}" class="transition-toggle-checkbox absolute block w-4 h-4 rounded-full bg-white border-2 appearance-none cursor-pointer" data-class-name="${cls.name}" ${classDateVisibility[cls.name] ? 'checked' : ''}/>
                        <label for="date-toggle-${cls.name.replace(/[^a-zA-Z0-9]/g, '-')}" class="toggle-label block overflow-hidden h-4 rounded-full bg-gray-300 cursor-pointer"></label>
                    </div>
                    <span class="arrow text-2xl font-bold ml-4">&#9660;</span>
                </div>
            </div>
            ${cardContentHtml}
        `;
        container.appendChild(classCard);
    });
};

// ===== UPDATED: Date change event with saving =====
document.getElementById('currentDate').addEventListener('change', async (e) => {
    try {
        await database.ref('settings/projectionDate').set(e.target.value);
        console.log('Projection date saved!');
        
        const dateInput = document.getElementById('currentDate');
        const originalBorder = dateInput.style.border;
        dateInput.style.border = '2px solid #10B981';
        setTimeout(() => {
            dateInput.style.border = originalBorder;
        }, 500);
    } catch (error) {
        console.error('Error saving date:', error);
    }
    updateDashboard();
});

const processStudentAdditions = (newStudents) => {
    newStudents.forEach(s => studentRoster.push({ 
        id: crypto.randomUUID(), 
        ...s,
        fte: 1,
        partner: '',
        comments: '',
        isStaffChild: false,
        enrollmentDate: '',
        withdrawalDate: ''
    }));
    const duplicates = findDuplicates();
    if (duplicates.length > 0) {
        showDuplicateModal(duplicates);
    } else {
        saveData();
        updateDashboard();
    }
};

document.getElementById('addStudentForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const name = document.getElementById('studentName').value;
    const dob = document.getElementById('studentDob').value;
    if (name && dob) {
        processStudentAdditions([{ name, dob }]);
        e.target.reset();
    }
});

// Modal Handling
const deleteModal = document.getElementById('deleteModal');
const confirmDeleteBtn = document.getElementById('confirmDeleteBtn');
const cancelDeleteBtn = document.getElementById('cancelDeleteBtn');
const deleteModalText = document.getElementById('modal-text-delete');
let studentIdsToDelete = [];
let deleteAllFlag = false;

const showDeleteModal = (ids, all = false) => {
    studentIdsToDelete = ids;
    deleteAllFlag = all;
    let message = '';
    if (all) {
        message = `Are you sure you want to delete all ${studentRoster.length} students? This action cannot be undone.`;
    } else if (ids.length > 1) {
        message = `Are you sure you want to delete these ${ids.length} students? This action cannot be undone.`;
    } else if (ids.length === 1) {
        const student = studentRoster.find(s => s.id === ids[0]);
        message = `Are you sure you want to delete ${student.name}? This action cannot be undone.`;
    }
    deleteModalText.textContent = message;
    deleteModal.classList.remove('hidden');
};

const hideDeleteModal = () => {
    deleteModal.classList.add('hidden');
    studentIdsToDelete = [];
    deleteAllFlag = false;
};

cancelDeleteBtn.addEventListener('click', hideDeleteModal);

confirmDeleteBtn.addEventListener('click', () => {
    if (deleteAllFlag) {
        studentRoster = [];
        manualAssignments = {};
        waitlistedAssignments = {};
        relationshipLinks = {};
    } else if (studentIdsToDelete.length > 0) {
        studentRoster = studentRoster.filter(student => !studentIdsToDelete.includes(student.id));
        studentIdsToDelete.forEach(id => {
            delete manualAssignments[id];
            delete waitlistedAssignments[id];
            const linkedPeers = relationshipLinks[id];
            if (linkedPeers) {
                linkedPeers.forEach(peer => {
                    if (relationshipLinks[peer.id]) {
                        relationshipLinks[peer.id] = relationshipLinks[peer.id].filter(p => p.id !== id);
                        if (relationshipLinks[peer.id].length === 0) {
                            delete relationshipLinks[peer.id];
                        }
                    }
                });
            }
            delete relationshipLinks[id];
        });
    }
    saveData();
    hideDeleteModal();
    updateDashboard();
});

const editModal = document.getElementById('editModal');
const editStudentForm = document.getElementById('editStudentForm');
const cancelEditBtn = document.getElementById('cancelEditBtn');
let studentIdToEdit = null;

const showEditModal = (id) => {
    const student = studentRoster.find(s => s.id === id);
    if(student) {
        studentIdToEdit = id;
        document.getElementById('editStudentName').value = student.name;
        document.getElementById('editStudentDob').value = student.dob;
        editModal.classList.remove('hidden');
    }
};

const hideEditModal = () => {
    editModal.classList.add('hidden');
    studentIdToEdit = null;
};

cancelEditBtn.addEventListener('click', hideEditModal);

editStudentForm.addEventListener('submit', (e) => {
    e.preventDefault();
    if(studentIdToEdit) {
        const student = studentRoster.find(s => s.id === studentIdToEdit);
        student.name = document.getElementById('editStudentName').value;
        student.dob = document.getElementById('editStudentDob').value;
        saveData();
        hideEditModal();
        updateDashboard();
    }
});

const bulkAddModal = document.getElementById('bulkAddModal');
const confirmBulkAddBtn = document.getElementById('confirmBulkAddBtn');
const cancelBulkAddBtn = document.getElementById('cancelBulkAddBtn');
const showBulkAddBtn = document.getElementById('showBulkAddBtn');

showBulkAddBtn.addEventListener('click', () => {
    bulkAddModal.classList.remove('hidden');
});

cancelBulkAddBtn.addEventListener('click', () => {
    bulkAddModal.classList.add('hidden');
});

confirmBulkAddBtn.addEventListener('click', () => {
    const bulkData = document.getElementById('bulkStudentData').value;
    const regex = /([^0-9/]+)(\d{1,2}\/\d{1,2}\/\d{4})/g;
    const newStudents = [];
    let match;
    while ((match = regex.exec(bulkData)) !== null) {
        const name = match[1].trim();
        const dateParts = match[2].split('/');
        const month = dateParts[0].padStart(2, '0');
        const day = dateParts[1].padStart(2, '0');
        const year = dateParts[2];
        const dob = `${year}-${month}-${day}`;
        
        if (name && dob) {
            newStudents.push({ name, dob });
        }
    }
    
    if (newStudents.length > 0) {
        processStudentAdditions(newStudents);
    }
    document.getElementById('bulkStudentData').value = '';
    bulkAddModal.classList.add('hidden');
});

const rosterTableBody = document.getElementById('rosterTableBody');
const waitlistTableBody = document.getElementById('waitlistTableBody');
const graduatedTableBody = document.getElementById('graduatedTableBody');
const deleteSelectedBtn = document.getElementById('deleteSelectedBtn');
const deleteAllBtn = document.getElementById('deleteAllBtn');

const updateDeleteButtonsState = () => {
    const selectedCheckboxes = rosterTableBody.querySelectorAll('.student-checkbox:checked');
    deleteSelectedBtn.disabled = selectedCheckboxes.length === 0;
    deleteAllBtn.disabled = studentRoster.length === 0;
};

const handleTableInputChange = (e) => {
     const target = e.target;
    const studentId = target.dataset.studentId;
    if (!studentId) return;

    const student = studentRoster.find(s => s.id === studentId);
    if (!student) return;

    if (target.classList.contains('fte-input')) {
        const fteValue = parseFloat(target.value);
        if (!isNaN(fteValue) && fteValue >= 0 && fteValue <= 1) {
            student.fte = fteValue;
        } else if (target.value === "") {
            student.fte = 0;
        } else {
            target.value = student.fte ?? 1;
        }
         saveData();
         updateDashboard(); 
    } else if (target.classList.contains('partner-text-input')) {
        student.partner = target.value;
         saveData();
    } else if (target.classList.contains('comments-input')) {
        student.comments = target.value;
         saveData();
    } else if (target.classList.contains('enrollment-date-input')) {
        student.enrollmentDate = target.value;
        saveData();
        updateDashboard();
    } else if (target.classList.contains('withdrawal-date-input')) {
        student.withdrawalDate = target.value;
        saveData();
        updateDashboard();
    } else if (target.classList.contains('transition-date-input')) {
        if (target.value) {
            manualTransitionDates[studentId] = target.value;
        } else {
            delete manualTransitionDates[studentId]; 
        }
        saveData();
        updateDashboard();
    }
};

const handleTableCheckboxChange = (e) => {
    const target = e.target;
    const studentId = e.target.dataset.studentId;
    const student = studentRoster.find(s => s.id === studentId);
    if (!student) return;

    if (target.classList.contains('student-checkbox')) {
        updateDeleteButtonsState();
    } else if (target.classList.contains('partner-checkbox')) {
        const textInput = document.querySelector(`#rosterTableBody .partner-text-input[data-student-id="${studentId}"], #waitlistTableBody .partner-text-input[data-student-id="${studentId}"], #graduatedTableBody .partner-text-input[data-student-id="${studentId}"]`);
        if(textInput) {
            if (e.target.checked) {
               textInput.classList.remove('hidden');
            } else {
               textInput.classList.add('hidden');
               textInput.value = '';
            }
        }
        if (!e.target.checked) {
            student.partner = '';
            saveData();
        }
    } else if (target.classList.contains('staff-checkbox')) {
        student.isStaffChild = e.target.checked;
        saveData();
        updateDashboard();
    }
};

rosterTableBody.addEventListener('change', handleTableCheckboxChange);
rosterTableBody.addEventListener('input', handleTableInputChange);
waitlistTableBody.addEventListener('change', handleTableCheckboxChange);
waitlistTableBody.addEventListener('input', handleTableInputChange);
graduatedTableBody.addEventListener('change', handleTableCheckboxChange);
graduatedTableBody.addEventListener('input', handleTableInputChange);

deleteSelectedBtn.addEventListener('click', () => {
    const selectedIds = Array.from(rosterTableBody.querySelectorAll('.student-checkbox:checked')).map(cb => cb.dataset.studentId);
    if (selectedIds.length > 0) {
        showDeleteModal(selectedIds);
    }
});

deleteAllBtn.addEventListener('click', () => {
    if (studentRoster.length > 0) {
        showDeleteModal([], true);
    }
});

const handleTableActions = (e) => {
    const target = e.target;
    if (target && target.classList.contains('delete-student-btn')) {
        const id = target.getAttribute('data-student-id');
        showDeleteModal([id]);
    }
    if (target && target.classList.contains('edit-student-btn')) {
        const id = target.getAttribute('data-student-id');
        showEditModal(id);
    }
    if (target && target.classList.contains('link-sibling-btn')) {
        const id = target.getAttribute('data-student-id');
        showRelationshipModal(id);
    }
};

rosterTableBody.addEventListener('click', handleTableActions);
waitlistTableBody.addEventListener('click', handleTableActions);
graduatedTableBody.addEventListener('click', handleTableActions);

const duplicateModal = document.getElementById('duplicateModal');
const duplicateList = document.getElementById('duplicateList');
const confirmDuplicateDeletionBtn = document.getElementById('confirmDuplicateDeletionBtn');
const cancelDuplicateDeletionBtn = document.getElementById('cancelDuplicateDeletionBtn');

const findDuplicates = () => {
    const studentMap = {};
    studentRoster.forEach(student => {
        const key = `${student.name.toLowerCase().trim()}|${student.dob}`;
        if (!studentMap[key]) {
            studentMap[key] = [];
        }
        studentMap[key].push(student);
    });
    return Object.values(studentMap).filter(group => group.length > 1);
};

const showDuplicateModal = (duplicateGroups) => {
    duplicateList.innerHTML = '';
    duplicateGroups.forEach(group => {
        const groupDiv = document.createElement('div');
        groupDiv.className = 'p-3 border rounded-lg bg-gray-50';
        const dob = parseDate(group[0].dob).toLocaleDateString();
        let listHtml = `<h4 class="font-semibold">${group[0].name} - DOB: ${dob}</h4><ul class="mt-2 space-y-1">`;
        group.forEach((student, index) => {
            listHtml += `
                <li class="flex items-center">
                    <input type="checkbox" id="dup-${student.id}" data-student-id="${student.id}" class="h-4 w-4 text-red-600 border-gray-300 rounded focus:ring-red-500 duplicate-checkbox" ${index > 0 ? 'checked' : ''}>
                    <label for="dup-${student.id}" class="ml-3 block text-sm text-gray-700">Student ID: ${student.id.substring(0,8)}</label>
                </li>
            `;
        });
        listHtml += '</ul>';
        groupDiv.innerHTML = listHtml;
        duplicateList.appendChild(groupDiv);
    });
    duplicateModal.classList.remove('hidden');
};

confirmDuplicateDeletionBtn.addEventListener('click', () => {
    const idsToDelete = Array.from(duplicateList.querySelectorAll('.duplicate-checkbox:checked')).map(cb => cb.dataset.studentId);
    if (idsToDelete.length > 0) {
        studentRoster = studentRoster.filter(s => !idsToDelete.includes(s.id));
    }
    duplicateModal.classList.add('hidden');
    saveData();
    updateDashboard();
});

cancelDuplicateDeletionBtn.addEventListener('click', () => {
    duplicateModal.classList.add('hidden');
    saveData();
    updateDashboard();
});

const siblingModal = document.getElementById('siblingModal');
const siblingListContainer = document.getElementById('siblingList');
const confirmSiblingBtn = document.getElementById('confirmSiblingBtn');
const cancelSiblingBtn = document.getElementById('cancelSiblingBtn');
let currentStudentIdForSiblings = null;

const showRelationshipModal = (studentId) => {
    currentStudentIdForSiblings = studentId;
    const student = studentRoster.find(s => s.id === studentId);
    document.getElementById('siblingModalTitle').textContent = `Link Relationship for ${student.name}`;
    
    siblingListContainer.innerHTML = '';
    const existingRelationships = relationshipLinks[studentId] || [];

    studentRoster.filter(s => s.id !== studentId).forEach(potentialPeer => {
        const existingRel = existingRelationships.find(r => r.id === potentialPeer.id);
        const isChecked = !!existingRel;
        
        document.querySelector('input[name="relationshipType"][value="S"]').checked = true;

        const div = document.createElement('div');
        div.className = 'flex items-center space-x-3 p-2 hover:bg-gray-100 rounded-md';
        div.innerHTML = `
            <input id="rel-${potentialPeer.id}" type="checkbox" ${isChecked ? 'checked' : ''} value="${potentialPeer.id}" class="h-4 w-4 text-amber-600 border-gray-300 rounded focus:ring-amber-500 peer-checkbox">
            <label for="rel-${potentialPeer.id}" class="text-sm text-gray-800">${potentialPeer.name}</label>
        `;
        siblingListContainer.appendChild(div);
    });

    const searchInput = document.getElementById('relationshipSearchInput');
    searchInput.value = '';
    searchInput.oninput = (e) => {
        const searchTerm = e.target.value.toLowerCase();
        siblingListContainer.querySelectorAll('div').forEach(peerDiv => {
            const label = peerDiv.querySelector('label');
            if (label.textContent.toLowerCase().includes(searchTerm)) {
                peerDiv.style.display = 'flex';
            } else {
                peerDiv.style.display = 'none';
            }
        });
    };

    siblingModal.classList.remove('hidden');
};

const hideSiblingModal = () => {
    siblingModal.classList.add('hidden');
    currentStudentIdForSiblings = null;
};

cancelSiblingBtn.addEventListener('click', hideSiblingModal);

confirmSiblingBtn.addEventListener('click', () => {
    if (!currentStudentIdForSiblings) return;

    const relationshipType = document.querySelector('input[name="relationshipType"]:checked').value;
    const selectedPeerIds = Array.from(siblingListContainer.querySelectorAll('input:checked')).map(cb => cb.value);
    
    const originalPeerIds = (relationshipLinks[currentStudentIdForSiblings] || []).map(link => link.id);
    const allInvolvedIds = new Set([currentStudentIdForSiblings, ...selectedPeerIds, ...originalPeerIds]);

    allInvolvedIds.forEach(memberId => {
        if (relationshipLinks[memberId]) {
            relationshipLinks[memberId] = relationshipLinks[memberId].filter(link => !allInvolvedIds.has(link.id));
        }
    });

    const newGroupIds = [currentStudentIdForSiblings, ...selectedPeerIds];
    if (newGroupIds.length > 1) {
        newGroupIds.forEach(memberId => {
            if (!relationshipLinks[memberId]) {
                relationshipLinks[memberId] = [];
            }
            const newLinks = newGroupIds
                .filter(id => id !== memberId)
                .map(id => ({ id, type: relationshipType }));
            relationshipLinks[memberId].push(...newLinks);
        });
    }

    saveData();
    hideSiblingModal();
    updateDashboard();
});

const individualRostersContainer = document.getElementById('individualRostersContainer');

individualRostersContainer.addEventListener('click', e => {
    const item = e.target.closest('.roster-item');
    if (item) {
        if (e.ctrlKey || e.metaKey) {
            item.classList.toggle('selected');
        } else {
            document.querySelectorAll('.roster-item.selected').forEach(el => el.classList.remove('selected'));
            item.classList.add('selected');
        }
    }
});

function getDragAfterElement(container, y) {
    const draggableElements = [...container.querySelectorAll('.class-roster-card:not(.dragging-card)')];
    return draggableElements.reduce((closest, child) => {
        const box = child.getBoundingClientRect();
        const offset = y - box.top - box.height / 2;
        if (offset < 0 && offset > closest.offset) {
            return { offset: offset, element: child };
        } else {
            return closest;
        }
    }, { offset: Number.NEGATIVE_INFINITY }).element;
}

individualRostersContainer.addEventListener('dragstart', e => {
    const targetItem = e.target.closest('.roster-item');
    if (targetItem) {
        const sourceCard = targetItem.closest('.class-roster-card');
        draggedStudentSourceClass = sourceCard ? sourceCard.dataset.className : null;
        
        if (!targetItem.classList.contains('selected')) {
            document.querySelectorAll('.roster-item.selected').forEach(el => el.classList.remove('selected'));
            targetItem.classList.add('selected');
        }
        selectedForDrag = Array.from(document.querySelectorAll('.roster-item.selected')).map(el => el.dataset.studentId);
        e.dataTransfer.setData('application/json', JSON.stringify(selectedForDrag));
        targetItem.style.opacity = '0.5';
    } else if (e.target.closest('.class-roster-card-header')) {
        const card = e.target.closest('.class-roster-card');
        card.classList.add('dragging-card');
         e.dataTransfer.setData('text/plain', card.dataset.className);
    }
});

individualRostersContainer.addEventListener('dragend', e => {
    draggedStudentSourceClass = null;
    const targetItem = e.target.closest('.roster-item');
    if (targetItem) {
         targetItem.style.opacity = '1';
    } else if (e.target.closest('.class-roster-card-header')) {
        const card = e.target.closest('.class-roster-card');
        card.classList.remove('dragging-card');
        const newOrderNames = Array.from(individualRostersContainer.querySelectorAll('.class-roster-card')).map(card => card.dataset.className);
        settings.classes.forEach(c => {
            const newIndex = newOrderNames.indexOf(c.name);
            if(newIndex !== -1) {
                c.order = newIndex;
            }
        });
        saveData();
        renderCapacitySettings();
        updateDashboard();
    }
    selectedForDrag = [];
    document.querySelectorAll('.roster-item.selected').forEach(el => el.classList.remove('selected'));
});

individualRostersContainer.addEventListener('dragover', e => {
    e.preventDefault();
    const draggingCard = document.querySelector('.dragging-card');
    if (draggingCard) {
        const afterElement = getDragAfterElement(individualRostersContainer, e.clientY);
        if (afterElement == null) {
            individualRostersContainer.appendChild(draggingCard);
        } else {
            individualRostersContainer.insertBefore(draggingCard, afterElement);
        }
    } else {
         const dropZone = e.target.closest('.drop-zone');
        if (dropZone) {
            document.querySelectorAll('.drop-zone').forEach(zone => zone.classList.remove('drop-zone-active'));
            dropZone.classList.add('drop-zone-active');
        }
    }
});

individualRostersContainer.addEventListener('dragleave', e => {
    const dropZone = e.target.closest('.drop-zone');
    if (dropZone) {
        dropZone.classList.remove('drop-zone-active');
    }
});

individualRostersContainer.addEventListener('drop', e => {
    e.preventDefault();
    const draggingCard = document.querySelector('.dragging-card');
    if (draggingCard) return;

    document.querySelectorAll('.drop-zone').forEach(zone => zone.classList.remove('drop-zone-active'));
    const dropZone = e.target.closest('.drop-zone');
    const targetCard = e.target.closest('.class-roster-card');
    
    if (targetCard && dropZone) {
        const studentIds = JSON.parse(e.dataTransfer.getData('application/json'));
        const currentDate = document.getElementById('currentDate').value;

        if (!studentIds || studentIds.length === 0) return;
        
        const targetClassName = targetCard.dataset.className;
        const targetSection = dropZone.dataset.section;

        studentIds.forEach(studentId => {
            const student = studentRoster.find(s => s.id === studentId);
            if (!student) return;

            const automaticClass = getAutomaticStudentClassBasedOnAge(student, currentDate);
            
            if (draggedStudentSourceClass === 'Graduated/Withdrawn' && targetClassName !== 'Graduated/Withdrawn') {
                student.withdrawalDate = '';
            }

            delete manualAssignments[studentId];
            delete waitlistedAssignments[studentId];
            delete subdivisionAssignments[studentId];
            
            if (targetClassName !== automaticClass) {
                manualAssignments[studentId] = targetClassName;
            }
            
            if (targetSection === 'waitlisted') {
                waitlistedAssignments[studentId] = targetClassName;
            } else if (targetSection === 'subdivision') {
                 subdivisionAssignments[studentId] = {
                    className: targetClassName,
                    index: parseInt(dropZone.dataset.index)
                };
            }

            if (targetClassName === 'Graduated/Withdrawn' && !student.withdrawalDate) {
                student.withdrawalDate = currentDate;
            }
        });
        
        saveData();
        updateDashboard();
    }
});

individualRostersContainer.addEventListener('change', e => {
     if (e.target.classList.contains('ready-checkbox')) {
        const studentId = e.target.dataset.studentId;
        const student = studentRoster.find(s => s.id === studentId);
        if (!student) return;
        
        const currentClass = getStudentClass(student, document.getElementById('currentDate').value);

        if (e.target.checked) {
            transitionReadiness[studentId] = { fromClass: currentClass };
        } else {
            delete transitionReadiness[studentId];
        }
        saveData();
        updateIndividualRosters(document.getElementById('currentDate').value);
    }
    if (e.target.classList.contains('transition-toggle-checkbox')) {
        const className = e.target.dataset.className;
        classDateVisibility[className] = e.target.checked;
        saveData();
        updateIndividualRosters(document.getElementById('currentDate').value);
    }
});

 individualRostersContainer.addEventListener('input', e => {
     if (e.target.classList.contains('subdivision-name-input')) {
        const className = e.target.dataset.className;
        const index = e.target.dataset.index;
        const classToUpdate = settings.classes.find(c => c.name === className);
        if(classToUpdate) {
            if (!classToUpdate.subdivisionNames) {
                classToUpdate.subdivisionNames = {};
            }
            classToUpdate.subdivisionNames[index] = e.target.value;
            saveData();
        }
     } else if(e.target.classList.contains('subdivision-cap-input')) {
         const className = e.target.dataset.className;
        const index = e.target.dataset.index;
        const classToUpdate = settings.classes.find(c => c.name === className);
        if(classToUpdate) {
            if (!classToUpdate.subdivisionCaps) {
                classToUpdate.subdivisionCaps = {};
            }
            classToUpdate.subdivisionCaps[index] = e.target.value;
            saveData();
        }
     }
 });

individualRostersContainer.addEventListener('mouseover', e => {
    const rosterItem = e.target.closest('.roster-item');
    if (rosterItem) {
        const studentId = rosterItem.dataset.studentId;
        const relations = relationshipLinks[studentId];
        if (relations && relations.length > 0) {
            const allFamilyIds = [studentId, ...relations.map(r => r.id)];
            allFamilyIds.forEach(id => {
                document.querySelectorAll(`.roster-item[data-student-id="${id}"]`).forEach(el => {
                    el.classList.add('sibling-hover-highlight');
                });
            });
        }
    }
});

individualRostersContainer.addEventListener('mouseout', e => {
    const rosterItem = e.target.closest('.roster-item');
     if (rosterItem) {
        const studentId = rosterItem.dataset.studentId;
        const relations = relationshipLinks[studentId];
         if (relations && relations.length > 0) {
            const allFamilyIds = [studentId, ...relations.map(r => r.id)];
            allFamilyIds.forEach(id => {
                document.querySelectorAll(`.roster-item[data-student-id="${id}"]`).forEach(el => {
                    el.classList.remove('sibling-hover-highlight');
                });
            });
        }
    }
});

document.body.addEventListener('click', e => {
    const trigger = e.target.closest('.collapsible-trigger, .collapsible-trigger-card');
    if(trigger) {
        const content = trigger.nextElementSibling;
        if(content) {
            content.classList.toggle('collapsed');
            trigger.classList.toggle('collapsed');
        }
    }
});

const createResizableTable = (table) => {
    if (!table) return;
    const headers = table.querySelectorAll('th');
    headers.forEach(header => {
        const resizer = header.querySelector('.resizer');
        if(!resizer) return;
        let x = 0;
        let w = 0;
        const mouseDownHandler = (e) => {
            x = e.clientX;
            const styles = window.getComputedStyle(header);
            w = parseInt(styles.width, 10);
            document.addEventListener('mousemove', mouseMoveHandler);
            document.addEventListener('mouseup', mouseUpHandler);
        };
        const mouseMoveHandler = (e) => {
            const dx = e.clientX - x;
            header.style.width = `${w + dx}px`;
        };
        const mouseUpHandler = () => {
            document.removeEventListener('mousemove', mouseMoveHandler);
            document.removeEventListener('mouseup', mouseUpHandler);
        };
        resizer.addEventListener('mousedown', mouseDownHandler);
    });
};

const tabDashboardBtn = document.getElementById('tab-dashboard');
const tabRostersBtn = document.getElementById('tab-rosters');
const contentDashboard = document.getElementById('tab-content-dashboard');
const contentRosters = document.getElementById('tab-content-rosters');

const switchTab = (activeTab) => {
    if (activeTab === 'dashboard') {
        tabDashboardBtn.classList.add('active');
        tabRostersBtn.classList.remove('active');
        contentDashboard.classList.remove('hidden');
        contentRosters.classList.add('hidden');
    } else {
        tabDashboardBtn.classList.remove('active');
        tabRostersBtn.classList.add('active');
        contentDashboard.classList.add('hidden');
        contentRosters.classList.remove('hidden');
    }
};

tabDashboardBtn.addEventListener('click', () => switchTab('dashboard'));
tabRostersBtn.addEventListener('click', () => switchTab('rosters'));

const initSortableTables = () => {
    const tables = [
        { id: 'mainRosterTheadRow', key: 'main' },
        { id: 'waitlistRosterTheadRow', key: 'waitlist' },
        { id: 'graduatedRosterTheadRow', key: 'graduated' }
    ];

    tables.forEach(tableInfo => {
        const el = document.getElementById(tableInfo.id);
        new Sortable(el, {
            animation: 150,
            filter: '.resizer',
            preventOnFilter: true,
            onEnd: (evt) => {
                const newOrder = Array.from(evt.target.children)
                    .map(th => th.dataset.columnKey)
                    .filter(Boolean);
                
                columnOrder[tableInfo.key] = newOrder;
                saveData();
                updateDashboard();
            }
        });
    });
};


window.addEventListener('userLoggedIn', async () => {
    await loadData();
    renderCapacitySettings();
    updateDashboard();
    initSortableTables();
});