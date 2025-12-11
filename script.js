
// --- Data & Logic ---

const STATE = {
    payments: []
};

/**
 * Simulates the loan day-by-day from Start Date to TODAY.
 * - No tenure assumption.
 * - No auto-payments.
 */
function simulateLoan(principal, annualRate, startDateStr, payments, interestFreq, tableFreq) {
    const startDate = new Date(startDateStr);
    const today = new Date(); // End of simulation

    // If start date is in future? 
    if (startDate > today) {
        return {
            currentBalance: principal,
            outstandingBalance: principal,
            totalInterest: 0,
            totalPaid: 0,
            ledger: []
        };
    }

    const simulationEnd = today;

    let balance = principal;
    let totalInterest = 0;
    let totalPaid = 0;

    // Ledger for Table View
    let ledger = [];

    // Create a timeline of events
    let events = [];

    // 1. Compounding Events
    let currentDate = new Date(startDate);
    // Add 1 period to start valid compounding
    if (interestFreq === 'monthly') currentDate.setMonth(currentDate.getMonth() + 1);
    else currentDate.setFullYear(currentDate.getFullYear() + 1);

    while (currentDate <= simulationEnd) {
        events.push({
            date: new Date(currentDate),
            type: 'INTEREST',
            payload: null
        });

        // Increment
        let nextDate = new Date(currentDate);
        if (interestFreq === 'monthly') nextDate.setMonth(nextDate.getMonth() + 1);
        else nextDate.setFullYear(nextDate.getFullYear() + 1);
        currentDate = nextDate;
    }

    // 2. Payment Events
    payments.forEach(p => {
        if (p.type === 'onetime') {
            let d = new Date(p.date);
            if (d >= startDate && d <= simulationEnd) {
                events.push({
                    date: d,
                    type: 'PAYMENT',
                    payload: { amount: p.amount, label: 'One-time Payment' }
                });
            }
        } else if (p.type === 'recurring') {
            let payDate = new Date(p.date);
            // Safety break
            let safety = 0;
            while (payDate <= simulationEnd && safety++ < 5000) {
                if (payDate >= startDate) {
                    events.push({
                        date: new Date(payDate),
                        type: 'PAYMENT',
                        payload: { amount: p.amount, label: 'Recurring Payment' }
                    });
                }

                // Next payment
                if (p.frequency === 'monthly') payDate.setMonth(payDate.getMonth() + 1);
                else payDate.setFullYear(payDate.getFullYear() + 1);
            }
        }
    });

    // Sort events chronologically
    events.sort((a, b) => a.date - b.date);

    // Process Events
    let currentBalance = principal;

    let periodEndDate = new Date(startDate);
    advanceDate(periodEndDate, tableFreq);

    let periodInterest = 0;
    let periodPrincipalPaid = 0;

    // Initial Record
    ledger.push({
        date: new Date(startDate),
        description: 'Loan Start',
        debit: 0,
        credit: 0,
        balance: principal,
        isFuture: false
    });

    for (let event of events) {
        // Finalize periods passed
        while (event.date > periodEndDate) {
            if (periodEndDate > simulationEnd) break;

            // Only add row if there was activity
            if (periodInterest !== 0 || periodPrincipalPaid !== 0) {
                ledger.push({
                    date: new Date(periodEndDate),
                    description: 'Period End',
                    debit: periodInterest,
                    credit: periodPrincipalPaid,
                    balance: currentBalance,
                    isFuture: false
                });
            }

            periodInterest = 0;
            periodPrincipalPaid = 0;
            advanceDate(periodEndDate, tableFreq);
        }

        if (currentBalance <= 0.01 && event.type === 'PAYMENT') continue;

        if (event.type === 'INTEREST') {
            let ratePerPeriod = (annualRate / 100) / (interestFreq === 'monthly' ? 12 : 1);
            let interestAmount = currentBalance * ratePerPeriod;

            currentBalance += interestAmount;
            totalInterest += interestAmount;
            periodInterest += interestAmount;
        } else if (event.type === 'PAYMENT') {
            let amount = event.payload.amount;
            if (amount > currentBalance) amount = currentBalance;

            currentBalance -= amount;
            totalPaid += amount;
            periodPrincipalPaid += amount;
        }
    }

    // Final catch up to Today
    while (periodEndDate <= simulationEnd) {
        if (periodInterest !== 0 || periodPrincipalPaid !== 0) {
            ledger.push({
                date: new Date(periodEndDate),
                description: 'Period End',
                debit: periodInterest,
                credit: periodPrincipalPaid,
                balance: currentBalance,
                isFuture: false
            });
        }
        periodInterest = 0;
        periodPrincipalPaid = 0;
        advanceDate(periodEndDate, tableFreq);
    }

    // Always show "Today" Row if last row wasn't today AND there is activity to show?
    // Or just if we have pending activity?
    const lastRow = ledger[ledger.length - 1];
    // Check pending activity or if we just want to mark Today.
    // User asked to hide rows with no change.
    // If periodInterest/Paid is 0, then Today row is same as last row.
    if ((periodInterest !== 0 || periodPrincipalPaid !== 0) && (!lastRow || !isValidDateMatch(lastRow.date, today))) {
        ledger.push({
            date: new Date(today),
            description: 'Today',
            debit: periodInterest,
            credit: periodPrincipalPaid,
            balance: currentBalance,
            isFuture: false
        });
    }


    return {
        outstandingBalance: currentBalance,
        totalInterest,
        totalPaid,
        ledger
    };
}

function advanceDate(date, freq) {
    if (freq === 'monthly') date.setMonth(date.getMonth() + 1);
    else date.setFullYear(date.getFullYear() + 1);
}

function isValidDateMatch(d1, d2) {
    return d1.getFullYear() === d2.getFullYear() &&
        d1.getMonth() === d2.getMonth() &&
        d1.getDate() === d2.getDate();
}


// --- UI Handling ---

const els = {
    principal: document.getElementById('principal'),
    rate: document.getElementById('rate'),
    interestFreq: document.getElementById('interestFreq'),
    startDate: document.getElementById('startDate'),

    // Payment Form
    paymentTypeBtns: document.querySelectorAll('.btn-tab'),
    payAmount: document.getElementById('payAmount'),
    payDate: document.getElementById('payDate'),
    payFreqGroup: document.getElementById('payFreqGroup'),
    payFreq: document.getElementById('payFreq'),
    addPaymentBtn: document.getElementById('addPaymentBtn'),
    paymentList: document.getElementById('paymentList'), // Now a table container

    // Table
    tableFreq: document.getElementById('tableFreq'),
    ledgerTableBody: document.querySelector('#ledgerTable tbody'),

    // Result
    balanceDisplay: document.getElementById('balanceDisplay'),
    statusMessage: document.getElementById('statusMessage'),
    totalPaidDisplay: document.getElementById('totalPaidDisplay'),
    totalInterestDisplay: document.getElementById('totalInterestDisplay'),
};

// No Defaults
const today = new Date();
els.payDate.valueAsDate = today;

// Event Listeners
[els.principal, els.rate, els.interestFreq, els.startDate, els.tableFreq].forEach(el => {
    el && el.addEventListener('change', updateUI);
    el && el.addEventListener('input', updateUI);
});

// Setup Payment Type Toggles
let currentPaymentType = 'recurring';
els.paymentTypeBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        els.paymentTypeBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentPaymentType = btn.dataset.type;
        els.payFreqGroup.style.display = currentPaymentType === 'recurring' ? 'block' : 'none';

        // Auto-set Date label
        const lbl = els.payDate.previousElementSibling;
        lbl.textContent = currentPaymentType === 'recurring' ? 'Start Date' : 'Payment Date';
    });
});

// Add Payment
els.addPaymentBtn.addEventListener('click', () => {
    const amount = parseFloat(els.payAmount.value);
    const date = els.payDate.value;

    if (!amount || !date) return alert("Please enter amount and date");

    STATE.payments.push({
        id: Date.now().toString(),
        type: currentPaymentType,
        amount,
        date,
        frequency: currentPaymentType === 'recurring' ? els.payFreq.value : null
    });

    renderPaymentList();
    updateUI();

    // Clear inputs
    els.payAmount.value = '';
});

function removePayment(id) {
    STATE.payments = STATE.payments.filter(p => p.id !== id);
    renderPaymentList();
    updateUI();
}
window.removePayment = removePayment;


function renderPaymentList() {
    // Sort logic
    const list = [...STATE.payments].sort((a, b) => new Date(a.date) - new Date(b.date));

    if (list.length === 0) {
        els.paymentList.innerHTML = '<div style="opacity:0.5; font-style:italic; padding:1rem; text-align:center;">No repayments added. Loan will only accrue interest.</div>';
        return;
    }

    let html = `<table class="payment-table">
        <thead>
            <tr>
                <th>Date</th>
                <th>Amount</th>
                <th>Type</th>
                <th>Action</th>
            </tr>
        </thead>
        <tbody>`;

    list.forEach(p => {
        html += `
            <tr>
                <td>${p.date}</td>
                <td>${formatCurrency(p.amount)}</td>
                <td>${p.type === 'recurring' ? 'Recurring (' + p.frequency + ')' : 'One-time'}</td>
                <td><button class="remove-btn" onclick="removePayment('${p.id}')">Delete</button></td>
            </tr>
        `;
    });

    html += `</tbody></table>`;
    els.paymentList.innerHTML = html;
}


function formatCurrency(num) {
    // INR formatting
    return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        maximumFractionDigits: 0
    }).format(num);
}

function formatDate(dateObj) {
    return dateObj.toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' });
}


function updateUI() {
    const principal = parseFloat(els.principal.value);
    const rate = parseFloat(els.rate.value);
    const startDateStr = els.startDate.value;

    // Check validity (don't calc if empty)
    if (!principal || !rate || !startDateStr) {
        els.balanceDisplay.textContent = '--';
        els.totalPaidDisplay.textContent = '--';
        els.totalInterestDisplay.textContent = '--';
        els.ledgerTableBody.innerHTML = '';
        return;
    }

    const result = simulateLoan(
        principal,
        rate,
        startDateStr,
        STATE.payments,
        els.interestFreq.value,
        els.tableFreq.value
    );

    els.balanceDisplay.textContent = formatCurrency(result.outstandingBalance);
    els.totalPaidDisplay.textContent = formatCurrency(result.totalPaid);
    els.totalInterestDisplay.textContent = formatCurrency(result.totalInterest);

    if (result.outstandingBalance <= 0) {
        els.statusMessage.textContent = "Paid Off";
        els.statusMessage.style.color = "var(--success-color)";
    } else {
        els.statusMessage.textContent = "Active";
        els.statusMessage.style.color = "var(--accent-color)";
    }

    // Render Table
    // Reverse order to show latest first? No, chronological is better for ledger usually.
    // Let's do chronological (default from simulateLoan)
    els.ledgerTableBody.innerHTML = result.ledger.map(row => `
        <tr>
            <td>${formatDate(row.date)}</td>
            <td style="color: #ef4444">+${formatCurrency(row.debit)}</td>
            <td style="color: #4ade80">-${formatCurrency(row.credit)}</td>
            <td style="font-weight:bold">${formatCurrency(row.balance)}</td>
        </tr>
    `).join('');
}

// Initial Render
renderPaymentList();
// No call to updateUI() until user enters data? Or check if inputs exist?
// Inputs are empty by default now (in HTML), so updateUI will show '--'.
updateUI();
