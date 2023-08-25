import Airtable from "airtable";
import * as fs from "fs";
import * as core from "@actions/core";

const base = process.env.AIRTABLE_PACKAGES_BASE;
const table = process.env.AIRTABLE_PACKAGES_TABLE;
const token = process.env.AIRTABLE_TOKEN;
const project = core.getInput('project', {required: true});
const environment = core.getInput('environment', {required: true});
const composerFile = core.getInput('composer-file') ? core.getInput('composer-file') : 'composer.lock';

const chunkSize = 10;

const packagesBase = new Airtable({apiKey: token}).base(base);

function deleteProjectEnvironmentPackages(project, environment) {
    return new Promise((resolve, reject) => {
        packagesBase(table).select({
            maxRecords: -1,
            pageSize: chunkSize,
            filterByFormula: `AND(project='${project}', environment='${environment}')`
        }).eachPage((records, fetchNextPage) => {
            if (!records.length) {
                resolve();
                return;
            }

            packagesBase(table).destroy(records.map(record => record.id), (err, deletedRecords) => {
                if (err) {
                    console.error('Cannot delete', err);
                    reject();
                    return;
                }
            });

            console.debug('Removing', records.length);

            fetchNextPage();
        }, function done(err) {
            if (err) {
                console.error('Cannot delete!', err);
                reject();
                return 1;
            }

            resolve();
        });
    })
}

function insertComposerPackages(project, environment, composerPackages, dev = false) {
    const packagesToAdd = composerPackages.map(aPackage => {
        return {
            name: aPackage.name,
            version: aPackage.version,
            description: aPackage.description,
            homepage: aPackage.homepage,
            project: project,
            environment: environment,
            dev: dev
        };
    });

    for (let i = 0; i < packagesToAdd.length; i += chunkSize) {
        const chunk = packagesToAdd.slice(i, i + chunkSize);

        packagesBase(table).create(chunk.map(aPackage => {
            return {"fields": aPackage}
        }), {typecast: true}, function (err, records) {
            if (err) {
                console.error(err);
                return 1;
            }

            console.log('Added', records.length)
        })
    }
}

try {
    deleteProjectEnvironmentPackages(project, environment)
        .then(() => {

            fs.readFile(composerFile, 'utf8', (error, data) => {
                if (error) {
                    console.error(error);
                    return;
                }

                const composerLock = JSON.parse(data);
                insertComposerPackages(project, environment, composerLock['packages'], false);
                insertComposerPackages(project, environment, composerLock['packages-dev'], true);

                console.log('Reported ' + composerLock['packages'].length + ' packags and ' + composerLock['packages-dev'].length + 'dev packages');
            })
        })
} catch (error) {
    core.setFailed(error.message);
}
