"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.get_continuations = get_continuations;
exports.get_sort_continuations = get_sort_continuations;
exports.get_validated_continuations = get_validated_continuations;
exports.get_parsed_continuation_items = get_parsed_continuation_items;
exports.get_continuation_params = get_continuation_params;
exports.get_reloadable_continuation_params = get_reloadable_continuation_params;
exports.get_continuation_contents = get_continuation_contents;
exports.resend_request_until_valid = resend_request_until_valid;
exports.validate_response = validate_response;
const util_js_1 = require("./util.js");
async function get_continuations(results, continuation_type, limit, request, parse, _ctoken_path = "", reloadable = false, stopAfter = (tracks) => false) {
    const get_params = () => reloadable
        ? get_reloadable_continuation_params(results)
        : get_continuation_params(results, _ctoken_path);
    const items = [];
    let params = get_params(), continuation = params.continuation;
    while ((typeof results === "string" || "continuations" in results) &&
        (limit == null || items.length < limit)) {
        const response = await request(params);
        if ("continuationContents" in response) {
            results = response.continuationContents[continuation_type];
            params = get_params();
            continuation = params.continuation;
        }
        else {
            break;
        }
        const contents = get_continuation_contents(results, parse);
        if (contents.length == 0)
            break;
        items.push(...contents);
        if (stopAfter(contents))
            break;
    }
    return { items, continuation };
}
async function get_sort_continuations(results, continuation_type, request, parse) {
    const get_params = () => get_reloadable_continuation_params(results);
    let params = get_params();
    const response = await request(params);
    if ("continuationContents" in response) {
        results = response.continuationContents[continuation_type];
        params = get_params();
    }
    else {
        return null;
    }
    return get_continuation_contents(results, parse);
}
async function get_validated_continuations(results, continuation_type, limit, per_page, request, parse, _ctoken_path = "") {
    const get_params = () => get_continuation_params(results, _ctoken_path);
    const items = [];
    let params = get_params(), continuation = params.continuation;
    while ((typeof results === "string" || "continuations" in results) &&
        (limit == null || items.length < limit)) {
        const response = await resend_request_until_valid(request, params, (response) => get_parsed_continuation_items(response, parse, continuation_type), (parsed) => validate_response(parsed, per_page, limit, items.length));
        params = get_params();
        continuation = params.continuation;
        results = response.results;
        items.push(...response.parsed);
    }
    return { items, continuation };
}
function get_parsed_continuation_items(response, parse, continuation_type) {
    const results = response.continuationContents[continuation_type];
    return {
        results,
        parsed: get_continuation_contents(results, parse),
    };
}
function get_continuation_params(results, ctoken_path = "") {
    const ctoken = typeof results === "string" ? results : (0, util_js_1.jo)(results, `continuations[0].next${ctoken_path}ContinuationData.continuation`);
    return get_continuation_object(ctoken);
}
function get_reloadable_continuation_params(results) {
    const ctoken = typeof results === "string" ? results : (0, util_js_1.jo)(results, `continuations[0].reloadContinuationData.continuation`);
    return get_continuation_object(ctoken);
}
function get_continuation_object(ctoken) {
    return {
        ctoken,
        continuation: ctoken,
        type: "next",
    };
}
function get_continuation_contents(continuation, parse) {
    for (const term of ["contents", "items"]) {
        if (term in continuation) {
            return parse(continuation[term], continuation);
        }
    }
    return [];
}
async function resend_request_until_valid(request, params, parse, validate, max_retries = 5) {
    const response = await request(params);
    let parsed_object = parse(response);
    let retries = 0;
    while (!validate(parsed_object) && retries < max_retries) {
        const response = await request(params);
        const attempt = parse(response);
        if (attempt.parsed.length > parsed_object.parsed.length) {
            parsed_object = attempt;
        }
        retries++;
    }
    return parsed_object;
}
function validate_response(response, per_page, limit, current_count) {
    const remaining = limit - current_count;
    const expected = Math.min(remaining, per_page);
    // response is invalid, if it has less items then minimal expected count
    return response.parsed.length >= expected;
}
