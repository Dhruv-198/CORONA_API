const API = {
    all: 'https://disease.sh/v3/covid-19/all',
    countries: 'https://disease.sh/v3/covid-19/countries',
    country: (country) => `https://disease.sh/v3/covid-19/countries/${country}`,
    usStates: 'https://disease.sh/v3/covid-19/states',
    usState: (state) => `https://disease.sh/v3/covid-19/states/${state}`,
    inStates: 'https://api.rootnet.in/covid19-in/stats/history'
};

let statesData = [];
let currentCountry = '';

function formatNumber(num) {
    if (!num) return '-';
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

function showError(message) {
    document.getElementById('errorMessage').textContent = message;
    document.getElementById('errorMessage').style.display = 'block';
    document.getElementById('loader').style.display = 'none';
    document.getElementById('dashboard').style.display = 'none';
}

function loadCountries() {
    fetch(API.countries)
        .then(response => response.json())
        .then(countries => {
            countries.sort((a, b) => a.country.localeCompare(b.country));
            const countrySelect = document.getElementById('countrySelector');
            countries.forEach(country => {
                const option = document.createElement('option');
                option.value = country.countryInfo.iso2 || country.country;
                option.textContent = country.country;
                countrySelect.appendChild(option);
            });
            loadData();
        })
        .catch(error => {
            showError('Failed to load countries list.');
            console.error('Error loading countries:', error);
        });
}

function loadStates(country, callback) {
    const stateSelect = document.getElementById('stateSelector');
    stateSelect.innerHTML = '<option value="all">All States/Provinces</option>';
    statesData = [];
    stateSelect.disabled = true;

    if (country === 'US') {
        fetch(API.usStates)
            .then(response => response.json())
            .then(data => {
                statesData = data;
                statesData.sort((a, b) => a.state.localeCompare(b.state));
                statesData.forEach(state => {
                    const option = document.createElement('option');
                    option.value = state.state;
                    option.textContent = state.state;
                    stateSelect.appendChild(option);
                });
                stateSelect.disabled = false;
                callback();
            })
            .catch(error => {
                console.error('Error loading US states:', error);
                stateSelect.innerHTML += '<option value="none">State data unavailable</option>';
                callback();
            });
    } else if (country === 'IN') {
        fetch(API.inStates)
            .then(response => response.json())
            .then(data => {
                const latest = data.data[data.data.length - 1];
                statesData = latest.regional.map(state => ({
                    state: state.loc,
                    cases: state.totalConfirmed || 0,
                    deaths: state.deaths || 0,
                    recovered: state.discharged || 0,
                    active: (state.totalConfirmed || 0) - (state.deaths || 0) - (state.discharged || 0),
                    updated: latest.day
                }));
                statesData.sort((a, b) => a.state.localeCompare(b.state));
                statesData.forEach(state => {
                    const option = document.createElement('option');
                    option.value = state.state;
                    option.textContent = state.state;
                    stateSelect.appendChild(option);
                });
                stateSelect.disabled = false;
                callback();
            })
            .catch(error => {
                console.error('Error loading Indian states:', error);
                stateSelect.innerHTML += '<option value="none">State data unavailable</option>';
                callback();
            });
    } else {
        stateSelect.innerHTML += '<option value="none">State/Province data unavailable</option>';
        callback();
    }
}

function handleCountryChange() {
    currentCountry = document.getElementById('countrySelector').value;
    loadStates(currentCountry, loadData);
}

function loadData() {
    const country = document.getElementById('countrySelector').value;
    const state = document.getElementById('stateSelector').value;

    document.getElementById('loader').style.display = 'block';
    document.getElementById('dashboard').style.display = 'none';
    document.getElementById('errorMessage').style.display = 'none';
    document.getElementById('statesSection').style.display = 'none';

    if (country === 'all') {
        fetch(API.all)
            .then(response => response.json())
            .then(data => {
                updateDashboard(data);
                document.getElementById('statesSection').style.display = 'none';
            })
            .catch(error => {
                showError('Failed to load COVID-19 data.');
                console.error('Error loading data:', error);
            });
    } else {
        if (country === 'US' && state !== 'all' && state !== 'none') {
            fetch(API.usState(state))
                .then(response => response.json())
                .then(data => {
                    updateDashboard(data);
                    document.getElementById('statesSection').style.display = 'none';
                })
                .catch(error => {
                    showError('Failed to load COVID-19 data.');
                    console.error('Error loading data:', error);
                });
        } else {
            if (country === 'IN' && state !== 'all' && state !== 'none') {
                const stateData = statesData.find(s => s.state === state);
                if (stateData) {
                    const data = {
                        cases: stateData.cases,
                        deaths: stateData.deaths,
                        recovered: stateData.recovered,
                        active: stateData.active,
                        updated: new Date(stateData.updated).getTime(),
                        todayCases: 0,
                        todayDeaths: 0,
                        tests: null,
                        casesPerOneMillion: null,
                        deathsPerOneMillion: null
                    };
                    updateDashboard(data);
                    document.getElementById('statesSection').style.display = 'none';
                } else {
                    showError('State data not found.');
                }
            } else {
                if (country === 'IN' && state === 'all') {
                    fetch(API.inStates)
                        .then(response => response.json())
                        .then(indiaData => {
                            const latest = indiaData.data[indiaData.data.length - 1];
                            const total = latest.summary;
                            const data = {
                                cases: total.total,
                                deaths: total.deaths,
                                recovered: total.discharged,
                                active: total.total - (total.deaths + total.discharged),
                                updated: new Date(latest.day).getTime(),
                                todayCases: 0,
                                todayDeaths: 0,
                                tests: total.totalTested || null,
                                casesPerOneMillion: null,
                                deathsPerOneMillion: null
                            };
                            updateDashboard(data);
                            updateStates(statesData.length > 0 ? statesData : []);
                        })
                        .catch(error => {
                            showError('Failed to load COVID-19 data.');
                            console.error('Error loading data:', error);
                        });
                } else {
                    if (state !== 'all' && state !== 'none' && country !== 'US' && country !== 'IN') {
                        showError('State/Province data is only available for USA and India.');
                    } else {
                        fetch(API.country(country))
                            .then(response => response.json())
                            .then(data => {
                                updateDashboard(data);
                                if (state === 'all' && (country === 'US' || country === 'IN')) {
                                    updateStates(statesData.length > 0 ? statesData : []);
                                } else if (state === 'all') {
                                    updateStates([]);
                                }
                            })
                            .catch(error => {
                                showError('Failed to load COVID-19 data.');
                                console.error('Error loading data:', error);
                            });
                    }
                }
            }
        }
    }
}

function updateDashboard(data) {
    document.getElementById('confirmedCases').textContent = formatNumber(data.cases);
    document.getElementById('activeCases').textContent = formatNumber(data.active || (data.cases - (data.deaths + data.recovered)));
    document.getElementById('recoveredCases').textContent = formatNumber(data.recovered);
    document.getElementById('deathCases').textContent = formatNumber(data.deaths);
    document.getElementById('todayCases').textContent = formatNumber(data.todayCases || 0);
    document.getElementById('todayDeaths').textContent = formatNumber(data.todayDeaths || 0);
    document.getElementById('totalTests').textContent = formatNumber(data.tests || 0);
    document.getElementById('casesPerMillion').textContent = formatNumber(data.casesPerOneMillion || 0);
    document.getElementById('deathsPerMillion').textContent = formatNumber(data.deathsPerOneMillion || 0);

    const recoveryRate = ((data.recovered / data.cases) * 100).toFixed(2) + '%';
    const fatalityRate = ((data.deaths / data.cases) * 100).toFixed(2) + '%';
    document.getElementById('recoveryRate').textContent = recoveryRate;
    document.getElementById('fatalityRate').textContent = fatalityRate;

    const lastUpdated = new Date(data.updated || Date.now());
    document.getElementById('lastUpdated').textContent = `Last Updated: ${lastUpdated.toLocaleString()}`;

    document.getElementById('loader').style.display = 'none';
    document.getElementById('dashboard').style.display = 'block';
}

function updateStates(states) {
    const container = document.getElementById('statesContainer');
    container.innerHTML = '';

    if (states.length === 0) {
        container.innerHTML = '<p class="text-muted">State/Province-level data is only available for USA and India in this tracker.</p>';
    } else {
        states.forEach(state => {
            const stateCard = `
        <div class="state-card">
            <div class="card-body">
                <h6>${state.state}</h6>
                <div class="row">
                    <div class="col-6 col-sm-3">
                        <p class="text-muted small">Cases:</p>
                        <p class="text-warning">${formatNumber(state.cases)}</p>
                    </div>
                    <div class="col-6 col-sm-3">
                        <p class="text-muted small">Active:</p>
                        <p class="text-primary">${formatNumber(state.active)}</p>
                    </div>
                    <div class="col-6 col-sm-3">
                        <p class="text-muted small">Recovered:</p>
                        <p class="text-success">${formatNumber(state.recovered)}</p>
                    </div>
                    <div class="col-6 col-sm-3">
                        <p class="text-muted small">Deaths:</p>
                        <p class="text-danger">${formatNumber(state.deaths)}</p>
                    </div>
                </div>
            </div>
        </div>
    `;
            container.innerHTML += stateCard;
        });
    }

    document.getElementById('statesSection').style.display = 'block';
}

window.onload = function () {
    loadCountries();
};