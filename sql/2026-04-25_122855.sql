--
-- PostgreSQL database dump
--

\restrict 8A55CoHaXHGkYJvArBojIff26lhje8X2IrVVOqmy81j6o7KWiavWao3fdPLfIFq

-- Dumped from database version 17.6
-- Dumped by pg_dump version 18.3

-- Started on 2026-04-25 12:35:22

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- TOC entry 307 (class 1259 OID 16529)
-- Name: audit_log_entries; Type: TABLE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TABLE auth.audit_log_entries (
    instance_id uuid,
    id uuid NOT NULL,
    payload json,
    created_at timestamp with time zone,
    ip_address character varying(64) DEFAULT ''::character varying NOT NULL
);


ALTER TABLE auth.audit_log_entries OWNER TO supabase_auth_admin;

--
-- TOC entry 4978 (class 0 OID 0)
-- Dependencies: 307
-- Name: TABLE audit_log_entries; Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON TABLE auth.audit_log_entries IS 'Auth: Audit trail for user actions.';


--
-- TOC entry 327 (class 1259 OID 17082)
-- Name: custom_oauth_providers; Type: TABLE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TABLE auth.custom_oauth_providers (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    provider_type text NOT NULL,
    identifier text NOT NULL,
    name text NOT NULL,
    client_id text NOT NULL,
    client_secret text NOT NULL,
    acceptable_client_ids text[] DEFAULT '{}'::text[] NOT NULL,
    scopes text[] DEFAULT '{}'::text[] NOT NULL,
    pkce_enabled boolean DEFAULT true NOT NULL,
    attribute_mapping jsonb DEFAULT '{}'::jsonb NOT NULL,
    authorization_params jsonb DEFAULT '{}'::jsonb NOT NULL,
    enabled boolean DEFAULT true NOT NULL,
    email_optional boolean DEFAULT false NOT NULL,
    issuer text,
    discovery_url text,
    skip_nonce_check boolean DEFAULT false NOT NULL,
    cached_discovery jsonb,
    discovery_cached_at timestamp with time zone,
    authorization_url text,
    token_url text,
    userinfo_url text,
    jwks_uri text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT custom_oauth_providers_authorization_url_https CHECK (((authorization_url IS NULL) OR (authorization_url ~~ 'https://%'::text))),
    CONSTRAINT custom_oauth_providers_authorization_url_length CHECK (((authorization_url IS NULL) OR (char_length(authorization_url) <= 2048))),
    CONSTRAINT custom_oauth_providers_client_id_length CHECK (((char_length(client_id) >= 1) AND (char_length(client_id) <= 512))),
    CONSTRAINT custom_oauth_providers_discovery_url_length CHECK (((discovery_url IS NULL) OR (char_length(discovery_url) <= 2048))),
    CONSTRAINT custom_oauth_providers_identifier_format CHECK ((identifier ~ '^[a-z0-9][a-z0-9:-]{0,48}[a-z0-9]$'::text)),
    CONSTRAINT custom_oauth_providers_issuer_length CHECK (((issuer IS NULL) OR ((char_length(issuer) >= 1) AND (char_length(issuer) <= 2048)))),
    CONSTRAINT custom_oauth_providers_jwks_uri_https CHECK (((jwks_uri IS NULL) OR (jwks_uri ~~ 'https://%'::text))),
    CONSTRAINT custom_oauth_providers_jwks_uri_length CHECK (((jwks_uri IS NULL) OR (char_length(jwks_uri) <= 2048))),
    CONSTRAINT custom_oauth_providers_name_length CHECK (((char_length(name) >= 1) AND (char_length(name) <= 100))),
    CONSTRAINT custom_oauth_providers_oauth2_requires_endpoints CHECK (((provider_type <> 'oauth2'::text) OR ((authorization_url IS NOT NULL) AND (token_url IS NOT NULL) AND (userinfo_url IS NOT NULL)))),
    CONSTRAINT custom_oauth_providers_oidc_discovery_url_https CHECK (((provider_type <> 'oidc'::text) OR (discovery_url IS NULL) OR (discovery_url ~~ 'https://%'::text))),
    CONSTRAINT custom_oauth_providers_oidc_issuer_https CHECK (((provider_type <> 'oidc'::text) OR (issuer IS NULL) OR (issuer ~~ 'https://%'::text))),
    CONSTRAINT custom_oauth_providers_oidc_requires_issuer CHECK (((provider_type <> 'oidc'::text) OR (issuer IS NOT NULL))),
    CONSTRAINT custom_oauth_providers_provider_type_check CHECK ((provider_type = ANY (ARRAY['oauth2'::text, 'oidc'::text]))),
    CONSTRAINT custom_oauth_providers_token_url_https CHECK (((token_url IS NULL) OR (token_url ~~ 'https://%'::text))),
    CONSTRAINT custom_oauth_providers_token_url_length CHECK (((token_url IS NULL) OR (char_length(token_url) <= 2048))),
    CONSTRAINT custom_oauth_providers_userinfo_url_https CHECK (((userinfo_url IS NULL) OR (userinfo_url ~~ 'https://%'::text))),
    CONSTRAINT custom_oauth_providers_userinfo_url_length CHECK (((userinfo_url IS NULL) OR (char_length(userinfo_url) <= 2048)))
);


ALTER TABLE auth.custom_oauth_providers OWNER TO supabase_auth_admin;

--
-- TOC entry 321 (class 1259 OID 16887)
-- Name: flow_state; Type: TABLE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TABLE auth.flow_state (
    id uuid NOT NULL,
    user_id uuid,
    auth_code text,
    code_challenge_method auth.code_challenge_method,
    code_challenge text,
    provider_type text NOT NULL,
    provider_access_token text,
    provider_refresh_token text,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    authentication_method text NOT NULL,
    auth_code_issued_at timestamp with time zone,
    invite_token text,
    referrer text,
    oauth_client_state_id uuid,
    linking_target_id uuid,
    email_optional boolean DEFAULT false NOT NULL
);


ALTER TABLE auth.flow_state OWNER TO supabase_auth_admin;

--
-- TOC entry 4981 (class 0 OID 0)
-- Dependencies: 321
-- Name: TABLE flow_state; Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON TABLE auth.flow_state IS 'Stores metadata for all OAuth/SSO login flows';


--
-- TOC entry 312 (class 1259 OID 16684)
-- Name: identities; Type: TABLE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TABLE auth.identities (
    provider_id text NOT NULL,
    user_id uuid NOT NULL,
    identity_data jsonb NOT NULL,
    provider text NOT NULL,
    last_sign_in_at timestamp with time zone,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    email text GENERATED ALWAYS AS (lower((identity_data ->> 'email'::text))) STORED,
    id uuid DEFAULT gen_random_uuid() NOT NULL
);


ALTER TABLE auth.identities OWNER TO supabase_auth_admin;

--
-- TOC entry 4983 (class 0 OID 0)
-- Dependencies: 312
-- Name: TABLE identities; Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON TABLE auth.identities IS 'Auth: Stores identities associated to a user.';


--
-- TOC entry 4984 (class 0 OID 0)
-- Dependencies: 312
-- Name: COLUMN identities.email; Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON COLUMN auth.identities.email IS 'Auth: Email is a generated column that references the optional email property in the identity_data';


--
-- TOC entry 306 (class 1259 OID 16522)
-- Name: instances; Type: TABLE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TABLE auth.instances (
    id uuid NOT NULL,
    uuid uuid,
    raw_base_config text,
    created_at timestamp with time zone,
    updated_at timestamp with time zone
);


ALTER TABLE auth.instances OWNER TO supabase_auth_admin;

--
-- TOC entry 4986 (class 0 OID 0)
-- Dependencies: 306
-- Name: TABLE instances; Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON TABLE auth.instances IS 'Auth: Manages users across multiple sites.';


--
-- TOC entry 316 (class 1259 OID 16774)
-- Name: mfa_amr_claims; Type: TABLE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TABLE auth.mfa_amr_claims (
    session_id uuid NOT NULL,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    authentication_method text NOT NULL,
    id uuid NOT NULL
);


ALTER TABLE auth.mfa_amr_claims OWNER TO supabase_auth_admin;

--
-- TOC entry 4988 (class 0 OID 0)
-- Dependencies: 316
-- Name: TABLE mfa_amr_claims; Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON TABLE auth.mfa_amr_claims IS 'auth: stores authenticator method reference claims for multi factor authentication';


--
-- TOC entry 315 (class 1259 OID 16762)
-- Name: mfa_challenges; Type: TABLE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TABLE auth.mfa_challenges (
    id uuid NOT NULL,
    factor_id uuid NOT NULL,
    created_at timestamp with time zone NOT NULL,
    verified_at timestamp with time zone,
    ip_address inet NOT NULL,
    otp_code text,
    web_authn_session_data jsonb
);


ALTER TABLE auth.mfa_challenges OWNER TO supabase_auth_admin;

--
-- TOC entry 4990 (class 0 OID 0)
-- Dependencies: 315
-- Name: TABLE mfa_challenges; Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON TABLE auth.mfa_challenges IS 'auth: stores metadata about challenge requests made';


--
-- TOC entry 314 (class 1259 OID 16749)
-- Name: mfa_factors; Type: TABLE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TABLE auth.mfa_factors (
    id uuid NOT NULL,
    user_id uuid NOT NULL,
    friendly_name text,
    factor_type auth.factor_type NOT NULL,
    status auth.factor_status NOT NULL,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    secret text,
    phone text,
    last_challenged_at timestamp with time zone,
    web_authn_credential jsonb,
    web_authn_aaguid uuid,
    last_webauthn_challenge_data jsonb
);


ALTER TABLE auth.mfa_factors OWNER TO supabase_auth_admin;

--
-- TOC entry 4992 (class 0 OID 0)
-- Dependencies: 314
-- Name: TABLE mfa_factors; Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON TABLE auth.mfa_factors IS 'auth: stores metadata about factors';


--
-- TOC entry 4993 (class 0 OID 0)
-- Dependencies: 314
-- Name: COLUMN mfa_factors.last_webauthn_challenge_data; Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON COLUMN auth.mfa_factors.last_webauthn_challenge_data IS 'Stores the latest WebAuthn challenge data including attestation/assertion for customer verification';


--
-- TOC entry 324 (class 1259 OID 16999)
-- Name: oauth_authorizations; Type: TABLE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TABLE auth.oauth_authorizations (
    id uuid NOT NULL,
    authorization_id text NOT NULL,
    client_id uuid NOT NULL,
    user_id uuid,
    redirect_uri text NOT NULL,
    scope text NOT NULL,
    state text,
    resource text,
    code_challenge text,
    code_challenge_method auth.code_challenge_method,
    response_type auth.oauth_response_type DEFAULT 'code'::auth.oauth_response_type NOT NULL,
    status auth.oauth_authorization_status DEFAULT 'pending'::auth.oauth_authorization_status NOT NULL,
    authorization_code text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    expires_at timestamp with time zone DEFAULT (now() + '00:03:00'::interval) NOT NULL,
    approved_at timestamp with time zone,
    nonce text,
    CONSTRAINT oauth_authorizations_authorization_code_length CHECK ((char_length(authorization_code) <= 255)),
    CONSTRAINT oauth_authorizations_code_challenge_length CHECK ((char_length(code_challenge) <= 128)),
    CONSTRAINT oauth_authorizations_expires_at_future CHECK ((expires_at > created_at)),
    CONSTRAINT oauth_authorizations_nonce_length CHECK ((char_length(nonce) <= 255)),
    CONSTRAINT oauth_authorizations_redirect_uri_length CHECK ((char_length(redirect_uri) <= 2048)),
    CONSTRAINT oauth_authorizations_resource_length CHECK ((char_length(resource) <= 2048)),
    CONSTRAINT oauth_authorizations_scope_length CHECK ((char_length(scope) <= 4096)),
    CONSTRAINT oauth_authorizations_state_length CHECK ((char_length(state) <= 4096))
);


ALTER TABLE auth.oauth_authorizations OWNER TO supabase_auth_admin;

--
-- TOC entry 326 (class 1259 OID 17072)
-- Name: oauth_client_states; Type: TABLE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TABLE auth.oauth_client_states (
    id uuid NOT NULL,
    provider_type text NOT NULL,
    code_verifier text,
    created_at timestamp with time zone NOT NULL
);


ALTER TABLE auth.oauth_client_states OWNER TO supabase_auth_admin;

--
-- TOC entry 4996 (class 0 OID 0)
-- Dependencies: 326
-- Name: TABLE oauth_client_states; Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON TABLE auth.oauth_client_states IS 'Stores OAuth states for third-party provider authentication flows where Supabase acts as the OAuth client.';


--
-- TOC entry 323 (class 1259 OID 16969)
-- Name: oauth_clients; Type: TABLE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TABLE auth.oauth_clients (
    id uuid NOT NULL,
    client_secret_hash text,
    registration_type auth.oauth_registration_type NOT NULL,
    redirect_uris text NOT NULL,
    grant_types text NOT NULL,
    client_name text,
    client_uri text,
    logo_uri text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    client_type auth.oauth_client_type DEFAULT 'confidential'::auth.oauth_client_type NOT NULL,
    token_endpoint_auth_method text NOT NULL,
    CONSTRAINT oauth_clients_client_name_length CHECK ((char_length(client_name) <= 1024)),
    CONSTRAINT oauth_clients_client_uri_length CHECK ((char_length(client_uri) <= 2048)),
    CONSTRAINT oauth_clients_logo_uri_length CHECK ((char_length(logo_uri) <= 2048)),
    CONSTRAINT oauth_clients_token_endpoint_auth_method_check CHECK ((token_endpoint_auth_method = ANY (ARRAY['client_secret_basic'::text, 'client_secret_post'::text, 'none'::text])))
);


ALTER TABLE auth.oauth_clients OWNER TO supabase_auth_admin;

--
-- TOC entry 325 (class 1259 OID 17032)
-- Name: oauth_consents; Type: TABLE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TABLE auth.oauth_consents (
    id uuid NOT NULL,
    user_id uuid NOT NULL,
    client_id uuid NOT NULL,
    scopes text NOT NULL,
    granted_at timestamp with time zone DEFAULT now() NOT NULL,
    revoked_at timestamp with time zone,
    CONSTRAINT oauth_consents_revoked_after_granted CHECK (((revoked_at IS NULL) OR (revoked_at >= granted_at))),
    CONSTRAINT oauth_consents_scopes_length CHECK ((char_length(scopes) <= 2048)),
    CONSTRAINT oauth_consents_scopes_not_empty CHECK ((char_length(TRIM(BOTH FROM scopes)) > 0))
);


ALTER TABLE auth.oauth_consents OWNER TO supabase_auth_admin;

--
-- TOC entry 322 (class 1259 OID 16937)
-- Name: one_time_tokens; Type: TABLE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TABLE auth.one_time_tokens (
    id uuid NOT NULL,
    user_id uuid NOT NULL,
    token_type auth.one_time_token_type NOT NULL,
    token_hash text NOT NULL,
    relates_to text NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    CONSTRAINT one_time_tokens_token_hash_check CHECK ((char_length(token_hash) > 0))
);


ALTER TABLE auth.one_time_tokens OWNER TO supabase_auth_admin;

--
-- TOC entry 305 (class 1259 OID 16511)
-- Name: refresh_tokens; Type: TABLE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TABLE auth.refresh_tokens (
    instance_id uuid,
    id bigint NOT NULL,
    token character varying(255),
    user_id character varying(255),
    revoked boolean,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    parent character varying(255),
    session_id uuid
);


ALTER TABLE auth.refresh_tokens OWNER TO supabase_auth_admin;

--
-- TOC entry 5001 (class 0 OID 0)
-- Dependencies: 305
-- Name: TABLE refresh_tokens; Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON TABLE auth.refresh_tokens IS 'Auth: Store of tokens used to refresh JWT tokens once they expire.';


--
-- TOC entry 304 (class 1259 OID 16510)
-- Name: refresh_tokens_id_seq; Type: SEQUENCE; Schema: auth; Owner: supabase_auth_admin
--

CREATE SEQUENCE auth.refresh_tokens_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE auth.refresh_tokens_id_seq OWNER TO supabase_auth_admin;

--
-- TOC entry 5003 (class 0 OID 0)
-- Dependencies: 304
-- Name: refresh_tokens_id_seq; Type: SEQUENCE OWNED BY; Schema: auth; Owner: supabase_auth_admin
--

ALTER SEQUENCE auth.refresh_tokens_id_seq OWNED BY auth.refresh_tokens.id;


--
-- TOC entry 319 (class 1259 OID 16816)
-- Name: saml_providers; Type: TABLE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TABLE auth.saml_providers (
    id uuid NOT NULL,
    sso_provider_id uuid NOT NULL,
    entity_id text NOT NULL,
    metadata_xml text NOT NULL,
    metadata_url text,
    attribute_mapping jsonb,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    name_id_format text,
    CONSTRAINT "entity_id not empty" CHECK ((char_length(entity_id) > 0)),
    CONSTRAINT "metadata_url not empty" CHECK (((metadata_url = NULL::text) OR (char_length(metadata_url) > 0))),
    CONSTRAINT "metadata_xml not empty" CHECK ((char_length(metadata_xml) > 0))
);


ALTER TABLE auth.saml_providers OWNER TO supabase_auth_admin;

--
-- TOC entry 5005 (class 0 OID 0)
-- Dependencies: 319
-- Name: TABLE saml_providers; Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON TABLE auth.saml_providers IS 'Auth: Manages SAML Identity Provider connections.';


--
-- TOC entry 320 (class 1259 OID 16834)
-- Name: saml_relay_states; Type: TABLE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TABLE auth.saml_relay_states (
    id uuid NOT NULL,
    sso_provider_id uuid NOT NULL,
    request_id text NOT NULL,
    for_email text,
    redirect_to text,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    flow_state_id uuid,
    CONSTRAINT "request_id not empty" CHECK ((char_length(request_id) > 0))
);


ALTER TABLE auth.saml_relay_states OWNER TO supabase_auth_admin;

--
-- TOC entry 5007 (class 0 OID 0)
-- Dependencies: 320
-- Name: TABLE saml_relay_states; Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON TABLE auth.saml_relay_states IS 'Auth: Contains SAML Relay State information for each Service Provider initiated login.';


--
-- TOC entry 308 (class 1259 OID 16537)
-- Name: schema_migrations; Type: TABLE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TABLE auth.schema_migrations (
    version character varying(255) NOT NULL
);


ALTER TABLE auth.schema_migrations OWNER TO supabase_auth_admin;

--
-- TOC entry 5009 (class 0 OID 0)
-- Dependencies: 308
-- Name: TABLE schema_migrations; Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON TABLE auth.schema_migrations IS 'Auth: Manages updates to the auth system.';


--
-- TOC entry 313 (class 1259 OID 16714)
-- Name: sessions; Type: TABLE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TABLE auth.sessions (
    id uuid NOT NULL,
    user_id uuid NOT NULL,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    factor_id uuid,
    aal auth.aal_level,
    not_after timestamp with time zone,
    refreshed_at timestamp without time zone,
    user_agent text,
    ip inet,
    tag text,
    oauth_client_id uuid,
    refresh_token_hmac_key text,
    refresh_token_counter bigint,
    scopes text,
    CONSTRAINT sessions_scopes_length CHECK ((char_length(scopes) <= 4096))
);


ALTER TABLE auth.sessions OWNER TO supabase_auth_admin;

--
-- TOC entry 5011 (class 0 OID 0)
-- Dependencies: 313
-- Name: TABLE sessions; Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON TABLE auth.sessions IS 'Auth: Stores session data associated to a user.';


--
-- TOC entry 5012 (class 0 OID 0)
-- Dependencies: 313
-- Name: COLUMN sessions.not_after; Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON COLUMN auth.sessions.not_after IS 'Auth: Not after is a nullable column that contains a timestamp after which the session should be regarded as expired.';


--
-- TOC entry 5013 (class 0 OID 0)
-- Dependencies: 313
-- Name: COLUMN sessions.refresh_token_hmac_key; Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON COLUMN auth.sessions.refresh_token_hmac_key IS 'Holds a HMAC-SHA256 key used to sign refresh tokens for this session.';


--
-- TOC entry 5014 (class 0 OID 0)
-- Dependencies: 313
-- Name: COLUMN sessions.refresh_token_counter; Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON COLUMN auth.sessions.refresh_token_counter IS 'Holds the ID (counter) of the last issued refresh token.';


--
-- TOC entry 318 (class 1259 OID 16801)
-- Name: sso_domains; Type: TABLE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TABLE auth.sso_domains (
    id uuid NOT NULL,
    sso_provider_id uuid NOT NULL,
    domain text NOT NULL,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    CONSTRAINT "domain not empty" CHECK ((char_length(domain) > 0))
);


ALTER TABLE auth.sso_domains OWNER TO supabase_auth_admin;

--
-- TOC entry 5016 (class 0 OID 0)
-- Dependencies: 318
-- Name: TABLE sso_domains; Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON TABLE auth.sso_domains IS 'Auth: Manages SSO email address domain mapping to an SSO Identity Provider.';


--
-- TOC entry 317 (class 1259 OID 16792)
-- Name: sso_providers; Type: TABLE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TABLE auth.sso_providers (
    id uuid NOT NULL,
    resource_id text,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    disabled boolean,
    CONSTRAINT "resource_id not empty" CHECK (((resource_id = NULL::text) OR (char_length(resource_id) > 0)))
);


ALTER TABLE auth.sso_providers OWNER TO supabase_auth_admin;

--
-- TOC entry 5018 (class 0 OID 0)
-- Dependencies: 317
-- Name: TABLE sso_providers; Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON TABLE auth.sso_providers IS 'Auth: Manages SSO identity provider information; see saml_providers for SAML.';


--
-- TOC entry 5019 (class 0 OID 0)
-- Dependencies: 317
-- Name: COLUMN sso_providers.resource_id; Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON COLUMN auth.sso_providers.resource_id IS 'Auth: Uniquely identifies a SSO provider according to a user-chosen resource ID (case insensitive), useful in infrastructure as code.';


--
-- TOC entry 303 (class 1259 OID 16499)
-- Name: users; Type: TABLE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TABLE auth.users (
    instance_id uuid,
    id uuid NOT NULL,
    aud character varying(255),
    role character varying(255),
    email character varying(255),
    encrypted_password character varying(255),
    email_confirmed_at timestamp with time zone,
    invited_at timestamp with time zone,
    confirmation_token character varying(255),
    confirmation_sent_at timestamp with time zone,
    recovery_token character varying(255),
    recovery_sent_at timestamp with time zone,
    email_change_token_new character varying(255),
    email_change character varying(255),
    email_change_sent_at timestamp with time zone,
    last_sign_in_at timestamp with time zone,
    raw_app_meta_data jsonb,
    raw_user_meta_data jsonb,
    is_super_admin boolean,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    phone text DEFAULT NULL::character varying,
    phone_confirmed_at timestamp with time zone,
    phone_change text DEFAULT ''::character varying,
    phone_change_token character varying(255) DEFAULT ''::character varying,
    phone_change_sent_at timestamp with time zone,
    confirmed_at timestamp with time zone GENERATED ALWAYS AS (LEAST(email_confirmed_at, phone_confirmed_at)) STORED,
    email_change_token_current character varying(255) DEFAULT ''::character varying,
    email_change_confirm_status smallint DEFAULT 0,
    banned_until timestamp with time zone,
    reauthentication_token character varying(255) DEFAULT ''::character varying,
    reauthentication_sent_at timestamp with time zone,
    is_sso_user boolean DEFAULT false NOT NULL,
    deleted_at timestamp with time zone,
    is_anonymous boolean DEFAULT false NOT NULL,
    CONSTRAINT users_email_change_confirm_status_check CHECK (((email_change_confirm_status >= 0) AND (email_change_confirm_status <= 2)))
);


ALTER TABLE auth.users OWNER TO supabase_auth_admin;

--
-- TOC entry 5021 (class 0 OID 0)
-- Dependencies: 303
-- Name: TABLE users; Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON TABLE auth.users IS 'Auth: Stores user login data within a secure schema.';


--
-- TOC entry 5022 (class 0 OID 0)
-- Dependencies: 303
-- Name: COLUMN users.is_sso_user; Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON COLUMN auth.users.is_sso_user IS 'Auth: Set this column to true when the account comes from SSO. These accounts can have duplicate emails.';


--
-- TOC entry 329 (class 1259 OID 17147)
-- Name: webauthn_challenges; Type: TABLE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TABLE auth.webauthn_challenges (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    challenge_type text NOT NULL,
    session_data jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    CONSTRAINT webauthn_challenges_challenge_type_check CHECK ((challenge_type = ANY (ARRAY['signup'::text, 'registration'::text, 'authentication'::text])))
);


ALTER TABLE auth.webauthn_challenges OWNER TO supabase_auth_admin;

--
-- TOC entry 328 (class 1259 OID 17124)
-- Name: webauthn_credentials; Type: TABLE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TABLE auth.webauthn_credentials (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    credential_id bytea NOT NULL,
    public_key bytea NOT NULL,
    attestation_type text DEFAULT ''::text NOT NULL,
    aaguid uuid,
    sign_count bigint DEFAULT 0 NOT NULL,
    transports jsonb DEFAULT '[]'::jsonb NOT NULL,
    backup_eligible boolean DEFAULT false NOT NULL,
    backed_up boolean DEFAULT false NOT NULL,
    friendly_name text DEFAULT ''::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    last_used_at timestamp with time zone
);


ALTER TABLE auth.webauthn_credentials OWNER TO supabase_auth_admin;

--
-- TOC entry 265 (class 1259 OID 13448)
-- Name: sql_features; Type: TABLE; Schema: information_schema; Owner: supabase_admin
--

CREATE TABLE information_schema.sql_features (
    feature_id information_schema.character_data,
    feature_name information_schema.character_data,
    sub_feature_id information_schema.character_data,
    sub_feature_name information_schema.character_data,
    is_supported information_schema.yes_or_no,
    is_verified_by information_schema.character_data,
    comments information_schema.character_data
);


ALTER TABLE information_schema.sql_features OWNER TO supabase_admin;

--
-- TOC entry 266 (class 1259 OID 13453)
-- Name: sql_implementation_info; Type: TABLE; Schema: information_schema; Owner: supabase_admin
--

CREATE TABLE information_schema.sql_implementation_info (
    implementation_info_id information_schema.character_data,
    implementation_info_name information_schema.character_data,
    integer_value information_schema.cardinal_number,
    character_value information_schema.character_data,
    comments information_schema.character_data
);


ALTER TABLE information_schema.sql_implementation_info OWNER TO supabase_admin;

--
-- TOC entry 267 (class 1259 OID 13458)
-- Name: sql_parts; Type: TABLE; Schema: information_schema; Owner: supabase_admin
--

CREATE TABLE information_schema.sql_parts (
    feature_id information_schema.character_data,
    feature_name information_schema.character_data,
    is_supported information_schema.yes_or_no,
    is_verified_by information_schema.character_data,
    comments information_schema.character_data
);


ALTER TABLE information_schema.sql_parts OWNER TO supabase_admin;

--
-- TOC entry 268 (class 1259 OID 13463)
-- Name: sql_sizing; Type: TABLE; Schema: information_schema; Owner: supabase_admin
--

CREATE TABLE information_schema.sql_sizing (
    sizing_id information_schema.cardinal_number,
    sizing_name information_schema.character_data,
    supported_value information_schema.cardinal_number,
    comments information_schema.character_data
);


ALTER TABLE information_schema.sql_sizing OWNER TO supabase_admin;

--
-- TOC entry 105 (class 1259 OID 2600)
-- Name: pg_aggregate; Type: TABLE; Schema: pg_catalog; Owner: supabase_admin
--

CREATE TABLE pg_catalog.pg_aggregate (
    aggfnoid regproc NOT NULL,
    aggkind "char" NOT NULL,
    aggnumdirectargs smallint NOT NULL,
    aggtransfn regproc NOT NULL,
    aggfinalfn regproc NOT NULL,
    aggcombinefn regproc NOT NULL,
    aggserialfn regproc NOT NULL,
    aggdeserialfn regproc NOT NULL,
    aggmtransfn regproc NOT NULL,
    aggminvtransfn regproc NOT NULL,
    aggmfinalfn regproc NOT NULL,
    aggfinalextra boolean NOT NULL,
    aggmfinalextra boolean NOT NULL,
    aggfinalmodify "char" NOT NULL,
    aggmfinalmodify "char" NOT NULL,
    aggsortop oid NOT NULL,
    aggtranstype oid NOT NULL,
    aggtransspace integer NOT NULL,
    aggmtranstype oid NOT NULL,
    aggmtransspace integer NOT NULL,
    agginitval text COLLATE pg_catalog."C",
    aggminitval text COLLATE pg_catalog."C"
);

ALTER TABLE ONLY pg_catalog.pg_aggregate REPLICA IDENTITY NOTHING;


ALTER TABLE pg_catalog.pg_aggregate OWNER TO supabase_admin;

--
-- TOC entry 106 (class 1259 OID 2601)
-- Name: pg_am; Type: TABLE; Schema: pg_catalog; Owner: supabase_admin
--

CREATE TABLE pg_catalog.pg_am (
    oid oid NOT NULL,
    amname name NOT NULL,
    amhandler regproc NOT NULL,
    amtype "char" NOT NULL
);

ALTER TABLE ONLY pg_catalog.pg_am REPLICA IDENTITY NOTHING;


ALTER TABLE pg_catalog.pg_am OWNER TO supabase_admin;

--
-- TOC entry 107 (class 1259 OID 2602)
-- Name: pg_amop; Type: TABLE; Schema: pg_catalog; Owner: supabase_admin
--

CREATE TABLE pg_catalog.pg_amop (
    oid oid NOT NULL,
    amopfamily oid NOT NULL,
    amoplefttype oid NOT NULL,
    amoprighttype oid NOT NULL,
    amopstrategy smallint NOT NULL,
    amoppurpose "char" NOT NULL,
    amopopr oid NOT NULL,
    amopmethod oid NOT NULL,
    amopsortfamily oid NOT NULL
);

ALTER TABLE ONLY pg_catalog.pg_amop REPLICA IDENTITY NOTHING;


ALTER TABLE pg_catalog.pg_amop OWNER TO supabase_admin;

--
-- TOC entry 108 (class 1259 OID 2603)
-- Name: pg_amproc; Type: TABLE; Schema: pg_catalog; Owner: supabase_admin
--

CREATE TABLE pg_catalog.pg_amproc (
    oid oid NOT NULL,
    amprocfamily oid NOT NULL,
    amproclefttype oid NOT NULL,
    amprocrighttype oid NOT NULL,
    amprocnum smallint NOT NULL,
    amproc regproc NOT NULL
);

ALTER TABLE ONLY pg_catalog.pg_amproc REPLICA IDENTITY NOTHING;


ALTER TABLE pg_catalog.pg_amproc OWNER TO supabase_admin;

--
-- TOC entry 109 (class 1259 OID 2604)
-- Name: pg_attrdef; Type: TABLE; Schema: pg_catalog; Owner: supabase_admin
--

CREATE TABLE pg_catalog.pg_attrdef (
    oid oid NOT NULL,
    adrelid oid NOT NULL,
    adnum smallint NOT NULL,
    adbin pg_node_tree NOT NULL COLLATE pg_catalog."C"
);

ALTER TABLE ONLY pg_catalog.pg_attrdef REPLICA IDENTITY NOTHING;


ALTER TABLE pg_catalog.pg_attrdef OWNER TO supabase_admin;

--
-- TOC entry 94 (class 1259 OID 1249)
-- Name: pg_attribute; Type: TABLE; Schema: pg_catalog; Owner: supabase_admin
--

CREATE TABLE pg_catalog.pg_attribute (
    attrelid oid NOT NULL,
    attname name NOT NULL,
    atttypid oid NOT NULL,
    attlen smallint NOT NULL,
    attnum smallint NOT NULL,
    attcacheoff integer NOT NULL,
    atttypmod integer NOT NULL,
    attndims smallint NOT NULL,
    attbyval boolean NOT NULL,
    attalign "char" NOT NULL,
    attstorage "char" NOT NULL,
    attcompression "char" NOT NULL,
    attnotnull boolean NOT NULL,
    atthasdef boolean NOT NULL,
    atthasmissing boolean NOT NULL,
    attidentity "char" NOT NULL,
    attgenerated "char" NOT NULL,
    attisdropped boolean NOT NULL,
    attislocal boolean NOT NULL,
    attinhcount smallint NOT NULL,
    attcollation oid NOT NULL,
    attstattarget smallint,
    attacl aclitem[],
    attoptions text[] COLLATE pg_catalog."C",
    attfdwoptions text[] COLLATE pg_catalog."C",
    attmissingval anyarray
);

ALTER TABLE ONLY pg_catalog.pg_attribute REPLICA IDENTITY NOTHING;


ALTER TABLE pg_catalog.pg_attribute OWNER TO supabase_admin;

SET default_tablespace = pg_global;

--
-- TOC entry 98 (class 1259 OID 1261)
-- Name: pg_auth_members; Type: TABLE; Schema: pg_catalog; Owner: supabase_admin; Tablespace: pg_global
--

CREATE TABLE pg_catalog.pg_auth_members (
    oid oid NOT NULL,
    roleid oid NOT NULL,
    member oid NOT NULL,
    grantor oid NOT NULL,
    admin_option boolean NOT NULL,
    inherit_option boolean NOT NULL,
    set_option boolean NOT NULL
);

ALTER TABLE ONLY pg_catalog.pg_auth_members REPLICA IDENTITY NOTHING;


ALTER TABLE pg_catalog.pg_auth_members OWNER TO supabase_admin;

--
-- TOC entry 97 (class 1259 OID 1260)
-- Name: pg_authid; Type: TABLE; Schema: pg_catalog; Owner: supabase_admin; Tablespace: pg_global
--

CREATE TABLE pg_catalog.pg_authid (
    oid oid NOT NULL,
    rolname name NOT NULL,
    rolsuper boolean NOT NULL,
    rolinherit boolean NOT NULL,
    rolcreaterole boolean NOT NULL,
    rolcreatedb boolean NOT NULL,
    rolcanlogin boolean NOT NULL,
    rolreplication boolean NOT NULL,
    rolbypassrls boolean NOT NULL,
    rolconnlimit integer NOT NULL,
    rolpassword text COLLATE pg_catalog."C",
    rolvaliduntil timestamp with time zone
);

ALTER TABLE ONLY pg_catalog.pg_authid REPLICA IDENTITY NOTHING;


ALTER TABLE pg_catalog.pg_authid OWNER TO supabase_admin;

SET default_tablespace = '';

--
-- TOC entry 110 (class 1259 OID 2605)
-- Name: pg_cast; Type: TABLE; Schema: pg_catalog; Owner: supabase_admin
--

CREATE TABLE pg_catalog.pg_cast (
    oid oid NOT NULL,
    castsource oid NOT NULL,
    casttarget oid NOT NULL,
    castfunc oid NOT NULL,
    castcontext "char" NOT NULL,
    castmethod "char" NOT NULL
);

ALTER TABLE ONLY pg_catalog.pg_cast REPLICA IDENTITY NOTHING;


ALTER TABLE pg_catalog.pg_cast OWNER TO supabase_admin;

--
-- TOC entry 96 (class 1259 OID 1259)
-- Name: pg_class; Type: TABLE; Schema: pg_catalog; Owner: supabase_admin
--

CREATE TABLE pg_catalog.pg_class (
    oid oid NOT NULL,
    relname name NOT NULL,
    relnamespace oid NOT NULL,
    reltype oid NOT NULL,
    reloftype oid NOT NULL,
    relowner oid NOT NULL,
    relam oid NOT NULL,
    relfilenode oid NOT NULL,
    reltablespace oid NOT NULL,
    relpages integer NOT NULL,
    reltuples real NOT NULL,
    relallvisible integer NOT NULL,
    reltoastrelid oid NOT NULL,
    relhasindex boolean NOT NULL,
    relisshared boolean NOT NULL,
    relpersistence "char" NOT NULL,
    relkind "char" NOT NULL,
    relnatts smallint NOT NULL,
    relchecks smallint NOT NULL,
    relhasrules boolean NOT NULL,
    relhastriggers boolean NOT NULL,
    relhassubclass boolean NOT NULL,
    relrowsecurity boolean NOT NULL,
    relforcerowsecurity boolean NOT NULL,
    relispopulated boolean NOT NULL,
    relreplident "char" NOT NULL,
    relispartition boolean NOT NULL,
    relrewrite oid NOT NULL,
    relfrozenxid xid NOT NULL,
    relminmxid xid NOT NULL,
    relacl aclitem[],
    reloptions text[] COLLATE pg_catalog."C",
    relpartbound pg_node_tree COLLATE pg_catalog."C"
);

ALTER TABLE ONLY pg_catalog.pg_class REPLICA IDENTITY NOTHING;


ALTER TABLE pg_catalog.pg_class OWNER TO supabase_admin;

--
-- TOC entry 135 (class 1259 OID 3456)
-- Name: pg_collation; Type: TABLE; Schema: pg_catalog; Owner: supabase_admin
--

CREATE TABLE pg_catalog.pg_collation (
    oid oid NOT NULL,
    collname name NOT NULL,
    collnamespace oid NOT NULL,
    collowner oid NOT NULL,
    collprovider "char" NOT NULL,
    collisdeterministic boolean NOT NULL,
    collencoding integer NOT NULL,
    collcollate text COLLATE pg_catalog."C",
    collctype text COLLATE pg_catalog."C",
    colllocale text COLLATE pg_catalog."C",
    collicurules text COLLATE pg_catalog."C",
    collversion text COLLATE pg_catalog."C"
);

ALTER TABLE ONLY pg_catalog.pg_collation REPLICA IDENTITY NOTHING;


ALTER TABLE pg_catalog.pg_collation OWNER TO supabase_admin;

--
-- TOC entry 111 (class 1259 OID 2606)
-- Name: pg_constraint; Type: TABLE; Schema: pg_catalog; Owner: supabase_admin
--

CREATE TABLE pg_catalog.pg_constraint (
    oid oid NOT NULL,
    conname name NOT NULL,
    connamespace oid NOT NULL,
    contype "char" NOT NULL,
    condeferrable boolean NOT NULL,
    condeferred boolean NOT NULL,
    convalidated boolean NOT NULL,
    conrelid oid NOT NULL,
    contypid oid NOT NULL,
    conindid oid NOT NULL,
    conparentid oid NOT NULL,
    confrelid oid NOT NULL,
    confupdtype "char" NOT NULL,
    confdeltype "char" NOT NULL,
    confmatchtype "char" NOT NULL,
    conislocal boolean NOT NULL,
    coninhcount smallint NOT NULL,
    connoinherit boolean NOT NULL,
    conkey smallint[],
    confkey smallint[],
    conpfeqop oid[],
    conppeqop oid[],
    conffeqop oid[],
    confdelsetcols smallint[],
    conexclop oid[],
    conbin pg_node_tree COLLATE pg_catalog."C"
);

ALTER TABLE ONLY pg_catalog.pg_constraint REPLICA IDENTITY NOTHING;


ALTER TABLE pg_catalog.pg_constraint OWNER TO supabase_admin;

--
-- TOC entry 112 (class 1259 OID 2607)
-- Name: pg_conversion; Type: TABLE; Schema: pg_catalog; Owner: supabase_admin
--

CREATE TABLE pg_catalog.pg_conversion (
    oid oid NOT NULL,
    conname name NOT NULL,
    connamespace oid NOT NULL,
    conowner oid NOT NULL,
    conforencoding integer NOT NULL,
    contoencoding integer NOT NULL,
    conproc regproc NOT NULL,
    condefault boolean NOT NULL
);

ALTER TABLE ONLY pg_catalog.pg_conversion REPLICA IDENTITY NOTHING;


ALTER TABLE pg_catalog.pg_conversion OWNER TO supabase_admin;

SET default_tablespace = pg_global;

--
-- TOC entry 99 (class 1259 OID 1262)
-- Name: pg_database; Type: TABLE; Schema: pg_catalog; Owner: supabase_admin; Tablespace: pg_global
--

CREATE TABLE pg_catalog.pg_database (
    oid oid NOT NULL,
    datname name NOT NULL,
    datdba oid NOT NULL,
    encoding integer NOT NULL,
    datlocprovider "char" NOT NULL,
    datistemplate boolean NOT NULL,
    datallowconn boolean NOT NULL,
    dathasloginevt boolean NOT NULL,
    datconnlimit integer NOT NULL,
    datfrozenxid xid NOT NULL,
    datminmxid xid NOT NULL,
    dattablespace oid NOT NULL,
    datcollate text NOT NULL COLLATE pg_catalog."C",
    datctype text NOT NULL COLLATE pg_catalog."C",
    datlocale text COLLATE pg_catalog."C",
    daticurules text COLLATE pg_catalog."C",
    datcollversion text COLLATE pg_catalog."C",
    datacl aclitem[]
);

ALTER TABLE ONLY pg_catalog.pg_database REPLICA IDENTITY NOTHING;


ALTER TABLE pg_catalog.pg_database OWNER TO supabase_admin;

--
-- TOC entry 126 (class 1259 OID 2964)
-- Name: pg_db_role_setting; Type: TABLE; Schema: pg_catalog; Owner: supabase_admin; Tablespace: pg_global
--

CREATE TABLE pg_catalog.pg_db_role_setting (
    setdatabase oid NOT NULL,
    setrole oid NOT NULL,
    setconfig text[] COLLATE pg_catalog."C"
);

ALTER TABLE ONLY pg_catalog.pg_db_role_setting REPLICA IDENTITY NOTHING;


ALTER TABLE pg_catalog.pg_db_role_setting OWNER TO supabase_admin;

SET default_tablespace = '';

--
-- TOC entry 90 (class 1259 OID 826)
-- Name: pg_default_acl; Type: TABLE; Schema: pg_catalog; Owner: supabase_admin
--

CREATE TABLE pg_catalog.pg_default_acl (
    oid oid NOT NULL,
    defaclrole oid NOT NULL,
    defaclnamespace oid NOT NULL,
    defaclobjtype "char" NOT NULL,
    defaclacl aclitem[] NOT NULL
);

ALTER TABLE ONLY pg_catalog.pg_default_acl REPLICA IDENTITY NOTHING;


ALTER TABLE pg_catalog.pg_default_acl OWNER TO supabase_admin;

--
-- TOC entry 113 (class 1259 OID 2608)
-- Name: pg_depend; Type: TABLE; Schema: pg_catalog; Owner: supabase_admin
--

CREATE TABLE pg_catalog.pg_depend (
    classid oid NOT NULL,
    objid oid NOT NULL,
    objsubid integer NOT NULL,
    refclassid oid NOT NULL,
    refobjid oid NOT NULL,
    refobjsubid integer NOT NULL,
    deptype "char" NOT NULL
);

ALTER TABLE ONLY pg_catalog.pg_depend REPLICA IDENTITY NOTHING;


ALTER TABLE pg_catalog.pg_depend OWNER TO supabase_admin;

--
-- TOC entry 114 (class 1259 OID 2609)
-- Name: pg_description; Type: TABLE; Schema: pg_catalog; Owner: supabase_admin
--

CREATE TABLE pg_catalog.pg_description (
    objoid oid NOT NULL,
    classoid oid NOT NULL,
    objsubid integer NOT NULL,
    description text NOT NULL COLLATE pg_catalog."C"
);

ALTER TABLE ONLY pg_catalog.pg_description REPLICA IDENTITY NOTHING;


ALTER TABLE pg_catalog.pg_description OWNER TO supabase_admin;

--
-- TOC entry 137 (class 1259 OID 3501)
-- Name: pg_enum; Type: TABLE; Schema: pg_catalog; Owner: supabase_admin
--

CREATE TABLE pg_catalog.pg_enum (
    oid oid NOT NULL,
    enumtypid oid NOT NULL,
    enumsortorder real NOT NULL,
    enumlabel name NOT NULL
);

ALTER TABLE ONLY pg_catalog.pg_enum REPLICA IDENTITY NOTHING;


ALTER TABLE pg_catalog.pg_enum OWNER TO supabase_admin;

--
-- TOC entry 136 (class 1259 OID 3466)
-- Name: pg_event_trigger; Type: TABLE; Schema: pg_catalog; Owner: supabase_admin
--

CREATE TABLE pg_catalog.pg_event_trigger (
    oid oid NOT NULL,
    evtname name NOT NULL,
    evtevent name NOT NULL,
    evtowner oid NOT NULL,
    evtfoid oid NOT NULL,
    evtenabled "char" NOT NULL,
    evttags text[] COLLATE pg_catalog."C"
);

ALTER TABLE ONLY pg_catalog.pg_event_trigger REPLICA IDENTITY NOTHING;


ALTER TABLE pg_catalog.pg_event_trigger OWNER TO supabase_admin;

--
-- TOC entry 128 (class 1259 OID 3079)
-- Name: pg_extension; Type: TABLE; Schema: pg_catalog; Owner: supabase_admin
--

CREATE TABLE pg_catalog.pg_extension (
    oid oid NOT NULL,
    extname name NOT NULL,
    extowner oid NOT NULL,
    extnamespace oid NOT NULL,
    extrelocatable boolean NOT NULL,
    extversion text NOT NULL COLLATE pg_catalog."C",
    extconfig oid[],
    extcondition text[] COLLATE pg_catalog."C"
);

ALTER TABLE ONLY pg_catalog.pg_extension REPLICA IDENTITY NOTHING;


ALTER TABLE pg_catalog.pg_extension OWNER TO supabase_admin;

--
-- TOC entry 103 (class 1259 OID 2328)
-- Name: pg_foreign_data_wrapper; Type: TABLE; Schema: pg_catalog; Owner: supabase_admin
--

CREATE TABLE pg_catalog.pg_foreign_data_wrapper (
    oid oid NOT NULL,
    fdwname name NOT NULL,
    fdwowner oid NOT NULL,
    fdwhandler oid NOT NULL,
    fdwvalidator oid NOT NULL,
    fdwacl aclitem[],
    fdwoptions text[] COLLATE pg_catalog."C"
);

ALTER TABLE ONLY pg_catalog.pg_foreign_data_wrapper REPLICA IDENTITY NOTHING;


ALTER TABLE pg_catalog.pg_foreign_data_wrapper OWNER TO supabase_admin;

--
-- TOC entry 100 (class 1259 OID 1417)
-- Name: pg_foreign_server; Type: TABLE; Schema: pg_catalog; Owner: supabase_admin
--

CREATE TABLE pg_catalog.pg_foreign_server (
    oid oid NOT NULL,
    srvname name NOT NULL,
    srvowner oid NOT NULL,
    srvfdw oid NOT NULL,
    srvtype text COLLATE pg_catalog."C",
    srvversion text COLLATE pg_catalog."C",
    srvacl aclitem[],
    srvoptions text[] COLLATE pg_catalog."C"
);

ALTER TABLE ONLY pg_catalog.pg_foreign_server REPLICA IDENTITY NOTHING;


ALTER TABLE pg_catalog.pg_foreign_server OWNER TO supabase_admin;

--
-- TOC entry 129 (class 1259 OID 3118)
-- Name: pg_foreign_table; Type: TABLE; Schema: pg_catalog; Owner: supabase_admin
--

CREATE TABLE pg_catalog.pg_foreign_table (
    ftrelid oid NOT NULL,
    ftserver oid NOT NULL,
    ftoptions text[] COLLATE pg_catalog."C"
);

ALTER TABLE ONLY pg_catalog.pg_foreign_table REPLICA IDENTITY NOTHING;


ALTER TABLE pg_catalog.pg_foreign_table OWNER TO supabase_admin;

--
-- TOC entry 115 (class 1259 OID 2610)
-- Name: pg_index; Type: TABLE; Schema: pg_catalog; Owner: supabase_admin
--

CREATE TABLE pg_catalog.pg_index (
    indexrelid oid NOT NULL,
    indrelid oid NOT NULL,
    indnatts smallint NOT NULL,
    indnkeyatts smallint NOT NULL,
    indisunique boolean NOT NULL,
    indnullsnotdistinct boolean NOT NULL,
    indisprimary boolean NOT NULL,
    indisexclusion boolean NOT NULL,
    indimmediate boolean NOT NULL,
    indisclustered boolean NOT NULL,
    indisvalid boolean NOT NULL,
    indcheckxmin boolean NOT NULL,
    indisready boolean NOT NULL,
    indislive boolean NOT NULL,
    indisreplident boolean NOT NULL,
    indkey int2vector NOT NULL,
    indcollation oidvector NOT NULL,
    indclass oidvector NOT NULL,
    indoption int2vector NOT NULL,
    indexprs pg_node_tree COLLATE pg_catalog."C",
    indpred pg_node_tree COLLATE pg_catalog."C"
);

ALTER TABLE ONLY pg_catalog.pg_index REPLICA IDENTITY NOTHING;


ALTER TABLE pg_catalog.pg_index OWNER TO supabase_admin;

--
-- TOC entry 116 (class 1259 OID 2611)
-- Name: pg_inherits; Type: TABLE; Schema: pg_catalog; Owner: supabase_admin
--

CREATE TABLE pg_catalog.pg_inherits (
    inhrelid oid NOT NULL,
    inhparent oid NOT NULL,
    inhseqno integer NOT NULL,
    inhdetachpending boolean NOT NULL
);

ALTER TABLE ONLY pg_catalog.pg_inherits REPLICA IDENTITY NOTHING;


ALTER TABLE pg_catalog.pg_inherits OWNER TO supabase_admin;

--
-- TOC entry 133 (class 1259 OID 3394)
-- Name: pg_init_privs; Type: TABLE; Schema: pg_catalog; Owner: supabase_admin
--

CREATE TABLE pg_catalog.pg_init_privs (
    objoid oid NOT NULL,
    classoid oid NOT NULL,
    objsubid integer NOT NULL,
    privtype "char" NOT NULL,
    initprivs aclitem[] NOT NULL
);

ALTER TABLE ONLY pg_catalog.pg_init_privs REPLICA IDENTITY NOTHING;


ALTER TABLE pg_catalog.pg_init_privs OWNER TO supabase_admin;

--
-- TOC entry 117 (class 1259 OID 2612)
-- Name: pg_language; Type: TABLE; Schema: pg_catalog; Owner: supabase_admin
--

CREATE TABLE pg_catalog.pg_language (
    oid oid NOT NULL,
    lanname name NOT NULL,
    lanowner oid NOT NULL,
    lanispl boolean NOT NULL,
    lanpltrusted boolean NOT NULL,
    lanplcallfoid oid NOT NULL,
    laninline oid NOT NULL,
    lanvalidator oid NOT NULL,
    lanacl aclitem[]
);

ALTER TABLE ONLY pg_catalog.pg_language REPLICA IDENTITY NOTHING;


ALTER TABLE pg_catalog.pg_language OWNER TO supabase_admin;

--
-- TOC entry 118 (class 1259 OID 2613)
-- Name: pg_largeobject; Type: TABLE; Schema: pg_catalog; Owner: supabase_admin
--

CREATE TABLE pg_catalog.pg_largeobject (
    loid oid NOT NULL,
    pageno integer NOT NULL,
    data bytea NOT NULL
);

ALTER TABLE ONLY pg_catalog.pg_largeobject REPLICA IDENTITY NOTHING;


ALTER TABLE pg_catalog.pg_largeobject OWNER TO supabase_admin;

--
-- TOC entry 127 (class 1259 OID 2995)
-- Name: pg_largeobject_metadata; Type: TABLE; Schema: pg_catalog; Owner: supabase_admin
--

CREATE TABLE pg_catalog.pg_largeobject_metadata (
    oid oid NOT NULL,
    lomowner oid NOT NULL,
    lomacl aclitem[]
);

ALTER TABLE ONLY pg_catalog.pg_largeobject_metadata REPLICA IDENTITY NOTHING;


ALTER TABLE pg_catalog.pg_largeobject_metadata OWNER TO supabase_admin;

--
-- TOC entry 119 (class 1259 OID 2615)
-- Name: pg_namespace; Type: TABLE; Schema: pg_catalog; Owner: supabase_admin
--

CREATE TABLE pg_catalog.pg_namespace (
    oid oid NOT NULL,
    nspname name NOT NULL,
    nspowner oid NOT NULL,
    nspacl aclitem[]
);

ALTER TABLE ONLY pg_catalog.pg_namespace REPLICA IDENTITY NOTHING;


ALTER TABLE pg_catalog.pg_namespace OWNER TO supabase_admin;

--
-- TOC entry 120 (class 1259 OID 2616)
-- Name: pg_opclass; Type: TABLE; Schema: pg_catalog; Owner: supabase_admin
--

CREATE TABLE pg_catalog.pg_opclass (
    oid oid NOT NULL,
    opcmethod oid NOT NULL,
    opcname name NOT NULL,
    opcnamespace oid NOT NULL,
    opcowner oid NOT NULL,
    opcfamily oid NOT NULL,
    opcintype oid NOT NULL,
    opcdefault boolean NOT NULL,
    opckeytype oid NOT NULL
);

ALTER TABLE ONLY pg_catalog.pg_opclass REPLICA IDENTITY NOTHING;


ALTER TABLE pg_catalog.pg_opclass OWNER TO supabase_admin;

--
-- TOC entry 121 (class 1259 OID 2617)
-- Name: pg_operator; Type: TABLE; Schema: pg_catalog; Owner: supabase_admin
--

CREATE TABLE pg_catalog.pg_operator (
    oid oid NOT NULL,
    oprname name NOT NULL,
    oprnamespace oid NOT NULL,
    oprowner oid NOT NULL,
    oprkind "char" NOT NULL,
    oprcanmerge boolean NOT NULL,
    oprcanhash boolean NOT NULL,
    oprleft oid NOT NULL,
    oprright oid NOT NULL,
    oprresult oid NOT NULL,
    oprcom oid NOT NULL,
    oprnegate oid NOT NULL,
    oprcode regproc NOT NULL,
    oprrest regproc NOT NULL,
    oprjoin regproc NOT NULL
);

ALTER TABLE ONLY pg_catalog.pg_operator REPLICA IDENTITY NOTHING;


ALTER TABLE pg_catalog.pg_operator OWNER TO supabase_admin;

--
-- TOC entry 125 (class 1259 OID 2753)
-- Name: pg_opfamily; Type: TABLE; Schema: pg_catalog; Owner: supabase_admin
--

CREATE TABLE pg_catalog.pg_opfamily (
    oid oid NOT NULL,
    opfmethod oid NOT NULL,
    opfname name NOT NULL,
    opfnamespace oid NOT NULL,
    opfowner oid NOT NULL
);

ALTER TABLE ONLY pg_catalog.pg_opfamily REPLICA IDENTITY NOTHING;


ALTER TABLE pg_catalog.pg_opfamily OWNER TO supabase_admin;

SET default_tablespace = pg_global;

--
-- TOC entry 153 (class 1259 OID 6243)
-- Name: pg_parameter_acl; Type: TABLE; Schema: pg_catalog; Owner: supabase_admin; Tablespace: pg_global
--

CREATE TABLE pg_catalog.pg_parameter_acl (
    oid oid NOT NULL,
    parname text NOT NULL COLLATE pg_catalog."C",
    paracl aclitem[]
);

ALTER TABLE ONLY pg_catalog.pg_parameter_acl REPLICA IDENTITY NOTHING;


ALTER TABLE pg_catalog.pg_parameter_acl OWNER TO supabase_admin;

SET default_tablespace = '';

--
-- TOC entry 131 (class 1259 OID 3350)
-- Name: pg_partitioned_table; Type: TABLE; Schema: pg_catalog; Owner: supabase_admin
--

CREATE TABLE pg_catalog.pg_partitioned_table (
    partrelid oid NOT NULL,
    partstrat "char" NOT NULL,
    partnatts smallint NOT NULL,
    partdefid oid NOT NULL,
    partattrs int2vector NOT NULL,
    partclass oidvector NOT NULL,
    partcollation oidvector NOT NULL,
    partexprs pg_node_tree COLLATE pg_catalog."C"
);

ALTER TABLE ONLY pg_catalog.pg_partitioned_table REPLICA IDENTITY NOTHING;


ALTER TABLE pg_catalog.pg_partitioned_table OWNER TO supabase_admin;

--
-- TOC entry 130 (class 1259 OID 3256)
-- Name: pg_policy; Type: TABLE; Schema: pg_catalog; Owner: supabase_admin
--

CREATE TABLE pg_catalog.pg_policy (
    oid oid NOT NULL,
    polname name NOT NULL,
    polrelid oid NOT NULL,
    polcmd "char" NOT NULL,
    polpermissive boolean NOT NULL,
    polroles oid[] NOT NULL,
    polqual pg_node_tree COLLATE pg_catalog."C",
    polwithcheck pg_node_tree COLLATE pg_catalog."C"
);

ALTER TABLE ONLY pg_catalog.pg_policy REPLICA IDENTITY NOTHING;


ALTER TABLE pg_catalog.pg_policy OWNER TO supabase_admin;

--
-- TOC entry 95 (class 1259 OID 1255)
-- Name: pg_proc; Type: TABLE; Schema: pg_catalog; Owner: supabase_admin
--

CREATE TABLE pg_catalog.pg_proc (
    oid oid NOT NULL,
    proname name NOT NULL,
    pronamespace oid NOT NULL,
    proowner oid NOT NULL,
    prolang oid NOT NULL,
    procost real NOT NULL,
    prorows real NOT NULL,
    provariadic oid NOT NULL,
    prosupport regproc NOT NULL,
    prokind "char" NOT NULL,
    prosecdef boolean NOT NULL,
    proleakproof boolean NOT NULL,
    proisstrict boolean NOT NULL,
    proretset boolean NOT NULL,
    provolatile "char" NOT NULL,
    proparallel "char" NOT NULL,
    pronargs smallint NOT NULL,
    pronargdefaults smallint NOT NULL,
    prorettype oid NOT NULL,
    proargtypes oidvector NOT NULL,
    proallargtypes oid[],
    proargmodes "char"[],
    proargnames text[] COLLATE pg_catalog."C",
    proargdefaults pg_node_tree COLLATE pg_catalog."C",
    protrftypes oid[],
    prosrc text NOT NULL COLLATE pg_catalog."C",
    probin text COLLATE pg_catalog."C",
    prosqlbody pg_node_tree COLLATE pg_catalog."C",
    proconfig text[] COLLATE pg_catalog."C",
    proacl aclitem[]
);

ALTER TABLE ONLY pg_catalog.pg_proc REPLICA IDENTITY NOTHING;


ALTER TABLE pg_catalog.pg_proc OWNER TO supabase_admin;

--
-- TOC entry 150 (class 1259 OID 6104)
-- Name: pg_publication; Type: TABLE; Schema: pg_catalog; Owner: supabase_admin
--

CREATE TABLE pg_catalog.pg_publication (
    oid oid NOT NULL,
    pubname name NOT NULL,
    pubowner oid NOT NULL,
    puballtables boolean NOT NULL,
    pubinsert boolean NOT NULL,
    pubupdate boolean NOT NULL,
    pubdelete boolean NOT NULL,
    pubtruncate boolean NOT NULL,
    pubviaroot boolean NOT NULL
);

ALTER TABLE ONLY pg_catalog.pg_publication REPLICA IDENTITY NOTHING;


ALTER TABLE pg_catalog.pg_publication OWNER TO supabase_admin;

--
-- TOC entry 152 (class 1259 OID 6237)
-- Name: pg_publication_namespace; Type: TABLE; Schema: pg_catalog; Owner: supabase_admin
--

CREATE TABLE pg_catalog.pg_publication_namespace (
    oid oid NOT NULL,
    pnpubid oid NOT NULL,
    pnnspid oid NOT NULL
);

ALTER TABLE ONLY pg_catalog.pg_publication_namespace REPLICA IDENTITY NOTHING;


ALTER TABLE pg_catalog.pg_publication_namespace OWNER TO supabase_admin;

--
-- TOC entry 151 (class 1259 OID 6106)
-- Name: pg_publication_rel; Type: TABLE; Schema: pg_catalog; Owner: supabase_admin
--

CREATE TABLE pg_catalog.pg_publication_rel (
    oid oid NOT NULL,
    prpubid oid NOT NULL,
    prrelid oid NOT NULL,
    prqual pg_node_tree COLLATE pg_catalog."C",
    prattrs int2vector
);

ALTER TABLE ONLY pg_catalog.pg_publication_rel REPLICA IDENTITY NOTHING;


ALTER TABLE pg_catalog.pg_publication_rel OWNER TO supabase_admin;

--
-- TOC entry 138 (class 1259 OID 3541)
-- Name: pg_range; Type: TABLE; Schema: pg_catalog; Owner: supabase_admin
--

CREATE TABLE pg_catalog.pg_range (
    rngtypid oid NOT NULL,
    rngsubtype oid NOT NULL,
    rngmultitypid oid NOT NULL,
    rngcollation oid NOT NULL,
    rngsubopc oid NOT NULL,
    rngcanonical regproc NOT NULL,
    rngsubdiff regproc NOT NULL
);

ALTER TABLE ONLY pg_catalog.pg_range REPLICA IDENTITY NOTHING;


ALTER TABLE pg_catalog.pg_range OWNER TO supabase_admin;

SET default_tablespace = pg_global;

--
-- TOC entry 147 (class 1259 OID 6000)
-- Name: pg_replication_origin; Type: TABLE; Schema: pg_catalog; Owner: supabase_admin; Tablespace: pg_global
--

CREATE TABLE pg_catalog.pg_replication_origin (
    roident oid NOT NULL,
    roname text NOT NULL COLLATE pg_catalog."C"
);

ALTER TABLE ONLY pg_catalog.pg_replication_origin REPLICA IDENTITY NOTHING;


ALTER TABLE pg_catalog.pg_replication_origin OWNER TO supabase_admin;

SET default_tablespace = '';

--
-- TOC entry 122 (class 1259 OID 2618)
-- Name: pg_rewrite; Type: TABLE; Schema: pg_catalog; Owner: supabase_admin
--

CREATE TABLE pg_catalog.pg_rewrite (
    oid oid NOT NULL,
    rulename name NOT NULL,
    ev_class oid NOT NULL,
    ev_type "char" NOT NULL,
    ev_enabled "char" NOT NULL,
    is_instead boolean NOT NULL,
    ev_qual pg_node_tree NOT NULL COLLATE pg_catalog."C",
    ev_action pg_node_tree NOT NULL COLLATE pg_catalog."C"
);

ALTER TABLE ONLY pg_catalog.pg_rewrite REPLICA IDENTITY NOTHING;


ALTER TABLE pg_catalog.pg_rewrite OWNER TO supabase_admin;

--
-- TOC entry 141 (class 1259 OID 3596)
-- Name: pg_seclabel; Type: TABLE; Schema: pg_catalog; Owner: supabase_admin
--

CREATE TABLE pg_catalog.pg_seclabel (
    objoid oid NOT NULL,
    classoid oid NOT NULL,
    objsubid integer NOT NULL,
    provider text NOT NULL COLLATE pg_catalog."C",
    label text NOT NULL COLLATE pg_catalog."C"
);

ALTER TABLE ONLY pg_catalog.pg_seclabel REPLICA IDENTITY NOTHING;


ALTER TABLE pg_catalog.pg_seclabel OWNER TO supabase_admin;

--
-- TOC entry 102 (class 1259 OID 2224)
-- Name: pg_sequence; Type: TABLE; Schema: pg_catalog; Owner: supabase_admin
--

CREATE TABLE pg_catalog.pg_sequence (
    seqrelid oid NOT NULL,
    seqtypid oid NOT NULL,
    seqstart bigint NOT NULL,
    seqincrement bigint NOT NULL,
    seqmax bigint NOT NULL,
    seqmin bigint NOT NULL,
    seqcache bigint NOT NULL,
    seqcycle boolean NOT NULL
);

ALTER TABLE ONLY pg_catalog.pg_sequence REPLICA IDENTITY NOTHING;


ALTER TABLE pg_catalog.pg_sequence OWNER TO supabase_admin;

SET default_tablespace = pg_global;

--
-- TOC entry 92 (class 1259 OID 1214)
-- Name: pg_shdepend; Type: TABLE; Schema: pg_catalog; Owner: supabase_admin; Tablespace: pg_global
--

CREATE TABLE pg_catalog.pg_shdepend (
    dbid oid NOT NULL,
    classid oid NOT NULL,
    objid oid NOT NULL,
    objsubid integer NOT NULL,
    refclassid oid NOT NULL,
    refobjid oid NOT NULL,
    deptype "char" NOT NULL
);

ALTER TABLE ONLY pg_catalog.pg_shdepend REPLICA IDENTITY NOTHING;


ALTER TABLE pg_catalog.pg_shdepend OWNER TO supabase_admin;

--
-- TOC entry 104 (class 1259 OID 2396)
-- Name: pg_shdescription; Type: TABLE; Schema: pg_catalog; Owner: supabase_admin; Tablespace: pg_global
--

CREATE TABLE pg_catalog.pg_shdescription (
    objoid oid NOT NULL,
    classoid oid NOT NULL,
    description text NOT NULL COLLATE pg_catalog."C"
);

ALTER TABLE ONLY pg_catalog.pg_shdescription REPLICA IDENTITY NOTHING;


ALTER TABLE pg_catalog.pg_shdescription OWNER TO supabase_admin;

--
-- TOC entry 140 (class 1259 OID 3592)
-- Name: pg_shseclabel; Type: TABLE; Schema: pg_catalog; Owner: supabase_admin; Tablespace: pg_global
--

CREATE TABLE pg_catalog.pg_shseclabel (
    objoid oid NOT NULL,
    classoid oid NOT NULL,
    provider text NOT NULL COLLATE pg_catalog."C",
    label text NOT NULL COLLATE pg_catalog."C"
);

ALTER TABLE ONLY pg_catalog.pg_shseclabel REPLICA IDENTITY NOTHING;


ALTER TABLE pg_catalog.pg_shseclabel OWNER TO supabase_admin;

SET default_tablespace = '';

--
-- TOC entry 123 (class 1259 OID 2619)
-- Name: pg_statistic; Type: TABLE; Schema: pg_catalog; Owner: supabase_admin
--

CREATE TABLE pg_catalog.pg_statistic (
    starelid oid NOT NULL,
    staattnum smallint NOT NULL,
    stainherit boolean NOT NULL,
    stanullfrac real NOT NULL,
    stawidth integer NOT NULL,
    stadistinct real NOT NULL,
    stakind1 smallint NOT NULL,
    stakind2 smallint NOT NULL,
    stakind3 smallint NOT NULL,
    stakind4 smallint NOT NULL,
    stakind5 smallint NOT NULL,
    staop1 oid NOT NULL,
    staop2 oid NOT NULL,
    staop3 oid NOT NULL,
    staop4 oid NOT NULL,
    staop5 oid NOT NULL,
    stacoll1 oid NOT NULL,
    stacoll2 oid NOT NULL,
    stacoll3 oid NOT NULL,
    stacoll4 oid NOT NULL,
    stacoll5 oid NOT NULL,
    stanumbers1 real[],
    stanumbers2 real[],
    stanumbers3 real[],
    stanumbers4 real[],
    stanumbers5 real[],
    stavalues1 anyarray,
    stavalues2 anyarray,
    stavalues3 anyarray,
    stavalues4 anyarray,
    stavalues5 anyarray
);

ALTER TABLE ONLY pg_catalog.pg_statistic REPLICA IDENTITY NOTHING;


ALTER TABLE pg_catalog.pg_statistic OWNER TO supabase_admin;

--
-- TOC entry 132 (class 1259 OID 3381)
-- Name: pg_statistic_ext; Type: TABLE; Schema: pg_catalog; Owner: supabase_admin
--

CREATE TABLE pg_catalog.pg_statistic_ext (
    oid oid NOT NULL,
    stxrelid oid NOT NULL,
    stxname name NOT NULL,
    stxnamespace oid NOT NULL,
    stxowner oid NOT NULL,
    stxkeys int2vector NOT NULL,
    stxstattarget smallint,
    stxkind "char"[] NOT NULL,
    stxexprs pg_node_tree COLLATE pg_catalog."C"
);

ALTER TABLE ONLY pg_catalog.pg_statistic_ext REPLICA IDENTITY NOTHING;


ALTER TABLE pg_catalog.pg_statistic_ext OWNER TO supabase_admin;

--
-- TOC entry 134 (class 1259 OID 3429)
-- Name: pg_statistic_ext_data; Type: TABLE; Schema: pg_catalog; Owner: supabase_admin
--

CREATE TABLE pg_catalog.pg_statistic_ext_data (
    stxoid oid NOT NULL,
    stxdinherit boolean NOT NULL,
    stxdndistinct pg_ndistinct COLLATE pg_catalog."C",
    stxddependencies pg_dependencies COLLATE pg_catalog."C",
    stxdmcv pg_mcv_list COLLATE pg_catalog."C",
    stxdexpr pg_statistic[]
);

ALTER TABLE ONLY pg_catalog.pg_statistic_ext_data REPLICA IDENTITY NOTHING;


ALTER TABLE pg_catalog.pg_statistic_ext_data OWNER TO supabase_admin;

SET default_tablespace = pg_global;

--
-- TOC entry 148 (class 1259 OID 6100)
-- Name: pg_subscription; Type: TABLE; Schema: pg_catalog; Owner: supabase_admin; Tablespace: pg_global
--

CREATE TABLE pg_catalog.pg_subscription (
    oid oid NOT NULL,
    subdbid oid NOT NULL,
    subskiplsn pg_lsn NOT NULL,
    subname name NOT NULL,
    subowner oid NOT NULL,
    subenabled boolean NOT NULL,
    subbinary boolean NOT NULL,
    substream "char" NOT NULL,
    subtwophasestate "char" NOT NULL,
    subdisableonerr boolean NOT NULL,
    subpasswordrequired boolean NOT NULL,
    subrunasowner boolean NOT NULL,
    subfailover boolean NOT NULL,
    subconninfo text NOT NULL COLLATE pg_catalog."C",
    subslotname name,
    subsynccommit text NOT NULL COLLATE pg_catalog."C",
    subpublications text[] NOT NULL COLLATE pg_catalog."C",
    suborigin text COLLATE pg_catalog."C"
);

ALTER TABLE ONLY pg_catalog.pg_subscription REPLICA IDENTITY NOTHING;


ALTER TABLE pg_catalog.pg_subscription OWNER TO supabase_admin;

SET default_tablespace = '';

--
-- TOC entry 149 (class 1259 OID 6102)
-- Name: pg_subscription_rel; Type: TABLE; Schema: pg_catalog; Owner: supabase_admin
--

CREATE TABLE pg_catalog.pg_subscription_rel (
    srsubid oid NOT NULL,
    srrelid oid NOT NULL,
    srsubstate "char" NOT NULL,
    srsublsn pg_lsn
);

ALTER TABLE ONLY pg_catalog.pg_subscription_rel REPLICA IDENTITY NOTHING;


ALTER TABLE pg_catalog.pg_subscription_rel OWNER TO supabase_admin;

SET default_tablespace = pg_global;

--
-- TOC entry 91 (class 1259 OID 1213)
-- Name: pg_tablespace; Type: TABLE; Schema: pg_catalog; Owner: supabase_admin; Tablespace: pg_global
--

CREATE TABLE pg_catalog.pg_tablespace (
    oid oid NOT NULL,
    spcname name NOT NULL,
    spcowner oid NOT NULL,
    spcacl aclitem[],
    spcoptions text[] COLLATE pg_catalog."C"
);

ALTER TABLE ONLY pg_catalog.pg_tablespace REPLICA IDENTITY NOTHING;


ALTER TABLE pg_catalog.pg_tablespace OWNER TO supabase_admin;

SET default_tablespace = '';

--
-- TOC entry 139 (class 1259 OID 3576)
-- Name: pg_transform; Type: TABLE; Schema: pg_catalog; Owner: supabase_admin
--

CREATE TABLE pg_catalog.pg_transform (
    oid oid NOT NULL,
    trftype oid NOT NULL,
    trflang oid NOT NULL,
    trffromsql regproc NOT NULL,
    trftosql regproc NOT NULL
);

ALTER TABLE ONLY pg_catalog.pg_transform REPLICA IDENTITY NOTHING;


ALTER TABLE pg_catalog.pg_transform OWNER TO supabase_admin;

--
-- TOC entry 124 (class 1259 OID 2620)
-- Name: pg_trigger; Type: TABLE; Schema: pg_catalog; Owner: supabase_admin
--

CREATE TABLE pg_catalog.pg_trigger (
    oid oid NOT NULL,
    tgrelid oid NOT NULL,
    tgparentid oid NOT NULL,
    tgname name NOT NULL,
    tgfoid oid NOT NULL,
    tgtype smallint NOT NULL,
    tgenabled "char" NOT NULL,
    tgisinternal boolean NOT NULL,
    tgconstrrelid oid NOT NULL,
    tgconstrindid oid NOT NULL,
    tgconstraint oid NOT NULL,
    tgdeferrable boolean NOT NULL,
    tginitdeferred boolean NOT NULL,
    tgnargs smallint NOT NULL,
    tgattr int2vector NOT NULL,
    tgargs bytea NOT NULL,
    tgqual pg_node_tree COLLATE pg_catalog."C",
    tgoldtable name,
    tgnewtable name
);

ALTER TABLE ONLY pg_catalog.pg_trigger REPLICA IDENTITY NOTHING;


ALTER TABLE pg_catalog.pg_trigger OWNER TO supabase_admin;

--
-- TOC entry 144 (class 1259 OID 3602)
-- Name: pg_ts_config; Type: TABLE; Schema: pg_catalog; Owner: supabase_admin
--

CREATE TABLE pg_catalog.pg_ts_config (
    oid oid NOT NULL,
    cfgname name NOT NULL,
    cfgnamespace oid NOT NULL,
    cfgowner oid NOT NULL,
    cfgparser oid NOT NULL
);

ALTER TABLE ONLY pg_catalog.pg_ts_config REPLICA IDENTITY NOTHING;


ALTER TABLE pg_catalog.pg_ts_config OWNER TO supabase_admin;

--
-- TOC entry 145 (class 1259 OID 3603)
-- Name: pg_ts_config_map; Type: TABLE; Schema: pg_catalog; Owner: supabase_admin
--

CREATE TABLE pg_catalog.pg_ts_config_map (
    mapcfg oid NOT NULL,
    maptokentype integer NOT NULL,
    mapseqno integer NOT NULL,
    mapdict oid NOT NULL
);

ALTER TABLE ONLY pg_catalog.pg_ts_config_map REPLICA IDENTITY NOTHING;


ALTER TABLE pg_catalog.pg_ts_config_map OWNER TO supabase_admin;

--
-- TOC entry 142 (class 1259 OID 3600)
-- Name: pg_ts_dict; Type: TABLE; Schema: pg_catalog; Owner: supabase_admin
--

CREATE TABLE pg_catalog.pg_ts_dict (
    oid oid NOT NULL,
    dictname name NOT NULL,
    dictnamespace oid NOT NULL,
    dictowner oid NOT NULL,
    dicttemplate oid NOT NULL,
    dictinitoption text COLLATE pg_catalog."C"
);

ALTER TABLE ONLY pg_catalog.pg_ts_dict REPLICA IDENTITY NOTHING;


ALTER TABLE pg_catalog.pg_ts_dict OWNER TO supabase_admin;

--
-- TOC entry 143 (class 1259 OID 3601)
-- Name: pg_ts_parser; Type: TABLE; Schema: pg_catalog; Owner: supabase_admin
--

CREATE TABLE pg_catalog.pg_ts_parser (
    oid oid NOT NULL,
    prsname name NOT NULL,
    prsnamespace oid NOT NULL,
    prsstart regproc NOT NULL,
    prstoken regproc NOT NULL,
    prsend regproc NOT NULL,
    prsheadline regproc NOT NULL,
    prslextype regproc NOT NULL
);

ALTER TABLE ONLY pg_catalog.pg_ts_parser REPLICA IDENTITY NOTHING;


ALTER TABLE pg_catalog.pg_ts_parser OWNER TO supabase_admin;

--
-- TOC entry 146 (class 1259 OID 3764)
-- Name: pg_ts_template; Type: TABLE; Schema: pg_catalog; Owner: supabase_admin
--

CREATE TABLE pg_catalog.pg_ts_template (
    oid oid NOT NULL,
    tmplname name NOT NULL,
    tmplnamespace oid NOT NULL,
    tmplinit regproc NOT NULL,
    tmpllexize regproc NOT NULL
);

ALTER TABLE ONLY pg_catalog.pg_ts_template REPLICA IDENTITY NOTHING;


ALTER TABLE pg_catalog.pg_ts_template OWNER TO supabase_admin;

--
-- TOC entry 93 (class 1259 OID 1247)
-- Name: pg_type; Type: TABLE; Schema: pg_catalog; Owner: supabase_admin
--

CREATE TABLE pg_catalog.pg_type (
    oid oid NOT NULL,
    typname name NOT NULL,
    typnamespace oid NOT NULL,
    typowner oid NOT NULL,
    typlen smallint NOT NULL,
    typbyval boolean NOT NULL,
    typtype "char" NOT NULL,
    typcategory "char" NOT NULL,
    typispreferred boolean NOT NULL,
    typisdefined boolean NOT NULL,
    typdelim "char" NOT NULL,
    typrelid oid NOT NULL,
    typsubscript regproc NOT NULL,
    typelem oid NOT NULL,
    typarray oid NOT NULL,
    typinput regproc NOT NULL,
    typoutput regproc NOT NULL,
    typreceive regproc NOT NULL,
    typsend regproc NOT NULL,
    typmodin regproc NOT NULL,
    typmodout regproc NOT NULL,
    typanalyze regproc NOT NULL,
    typalign "char" NOT NULL,
    typstorage "char" NOT NULL,
    typnotnull boolean NOT NULL,
    typbasetype oid NOT NULL,
    typtypmod integer NOT NULL,
    typndims integer NOT NULL,
    typcollation oid NOT NULL,
    typdefaultbin pg_node_tree COLLATE pg_catalog."C",
    typdefault text COLLATE pg_catalog."C",
    typacl aclitem[]
);

ALTER TABLE ONLY pg_catalog.pg_type REPLICA IDENTITY NOTHING;


ALTER TABLE pg_catalog.pg_type OWNER TO supabase_admin;

--
-- TOC entry 101 (class 1259 OID 1418)
-- Name: pg_user_mapping; Type: TABLE; Schema: pg_catalog; Owner: supabase_admin
--

CREATE TABLE pg_catalog.pg_user_mapping (
    oid oid NOT NULL,
    umuser oid NOT NULL,
    umserver oid NOT NULL,
    umoptions text[] COLLATE pg_catalog."C"
);

ALTER TABLE ONLY pg_catalog.pg_user_mapping REPLICA IDENTITY NOTHING;


ALTER TABLE pg_catalog.pg_user_mapping OWNER TO supabase_admin;

--
-- TOC entry 360 (class 1259 OID 18233)
-- Name: audit_log; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.audit_log (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    admin_id uuid,
    action text NOT NULL,
    table_name text NOT NULL,
    record_id text,
    old_data jsonb,
    new_data jsonb,
    ip_address inet,
    user_agent text
);


ALTER TABLE public.audit_log OWNER TO postgres;

--
-- TOC entry 372 (class 1259 OID 18484)
-- Name: champion_masteries; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.champion_masteries (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    riot_account_id uuid NOT NULL,
    champion_id integer NOT NULL,
    champion_name text,
    mastery_level integer DEFAULT 0 NOT NULL,
    mastery_points integer DEFAULT 0 NOT NULL,
    last_play_time timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.champion_masteries OWNER TO postgres;

--
-- TOC entry 358 (class 1259 OID 18189)
-- Name: disputes; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.disputes (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    match_id uuid NOT NULL,
    reported_by uuid,
    reason text NOT NULL,
    evidence_url text,
    status public.dispute_status DEFAULT 'OPEN'::public.dispute_status,
    resolved_by uuid,
    resolution_notes text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.disputes OWNER TO postgres;

--
-- TOC entry 349 (class 1259 OID 17769)
-- Name: inscricoes; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.inscricoes (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    tournament_id uuid NOT NULL,
    team_id uuid NOT NULL,
    requested_by uuid,
    status public.inscricao_status DEFAULT 'PENDING'::public.inscricao_status NOT NULL,
    reviewed_by uuid,
    reviewed_at timestamp with time zone,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    checked_in_at timestamp with time zone
);


ALTER TABLE public.inscricoes OWNER TO postgres;

--
-- TOC entry 352 (class 1259 OID 17895)
-- Name: match_games; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.match_games (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    match_id uuid NOT NULL,
    game_number integer NOT NULL,
    winner_id uuid,
    riot_game_id text,
    duration_sec integer,
    picks_bans jsonb,
    played_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT match_games_duration_sec_check CHECK ((duration_sec >= 0)),
    CONSTRAINT match_games_game_number_check CHECK ((game_number >= 1))
);


ALTER TABLE public.match_games OWNER TO postgres;

--
-- TOC entry 350 (class 1259 OID 17801)
-- Name: matches; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.matches (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    tournament_id uuid NOT NULL,
    round integer DEFAULT 1 NOT NULL,
    match_order integer DEFAULT 1 NOT NULL,
    status public.match_status DEFAULT 'SCHEDULED'::public.match_status NOT NULL,
    team_a_id uuid,
    team_b_id uuid,
    winner_id uuid,
    score_a integer,
    score_b integer,
    riot_match_id text,
    scheduled_at timestamp with time zone,
    played_at timestamp with time zone,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    format text DEFAULT 'BO1'::text NOT NULL,
    stage_id uuid,
    CONSTRAINT matches_format_check CHECK ((format = ANY (ARRAY['BO1'::text, 'BO3'::text, 'BO5'::text]))),
    CONSTRAINT matches_round_check CHECK ((round >= 1)),
    CONSTRAINT matches_score_a_check CHECK ((score_a >= 0)),
    CONSTRAINT matches_score_b_check CHECK ((score_b >= 0))
);


ALTER TABLE public.matches OWNER TO postgres;

--
-- TOC entry 354 (class 1259 OID 17977)
-- Name: notifications; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.notifications (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    user_id uuid NOT NULL,
    type text NOT NULL,
    title text NOT NULL,
    body text,
    read boolean DEFAULT false NOT NULL,
    metadata jsonb,
    expires_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    message text,
    link text
);


ALTER TABLE public.notifications OWNER TO postgres;

--
-- TOC entry 353 (class 1259 OID 17919)
-- Name: player_stats; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.player_stats (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    game_id uuid NOT NULL,
    player_id uuid,
    team_id uuid,
    champion text,
    kills integer DEFAULT 0 NOT NULL,
    deaths integer DEFAULT 0 NOT NULL,
    assists integer DEFAULT 0 NOT NULL,
    cs integer DEFAULT 0 NOT NULL,
    vision_score integer DEFAULT 0 NOT NULL,
    damage_dealt integer DEFAULT 0 NOT NULL,
    is_mvp boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT player_stats_assists_check CHECK ((assists >= 0)),
    CONSTRAINT player_stats_cs_check CHECK ((cs >= 0)),
    CONSTRAINT player_stats_damage_dealt_check CHECK ((damage_dealt >= 0)),
    CONSTRAINT player_stats_deaths_check CHECK ((deaths >= 0)),
    CONSTRAINT player_stats_kills_check CHECK ((kills >= 0)),
    CONSTRAINT player_stats_vision_score_check CHECK ((vision_score >= 0))
);


ALTER TABLE public.player_stats OWNER TO postgres;

--
-- TOC entry 348 (class 1259 OID 17740)
-- Name: players; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.players (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    team_id uuid,
    summoner_name text NOT NULL,
    tag_line text DEFAULT 'BR1'::text NOT NULL,
    puuid text,
    role public.player_role,
    tier text DEFAULT 'UNRANKED'::text NOT NULL,
    rank text DEFAULT ''::text NOT NULL,
    lp integer DEFAULT 0 NOT NULL,
    wins integer DEFAULT 0 NOT NULL,
    losses integer DEFAULT 0 NOT NULL,
    profile_icon integer,
    summoner_level integer,
    last_synced timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT players_losses_check CHECK ((losses >= 0)),
    CONSTRAINT players_lp_check CHECK ((lp >= 0)),
    CONSTRAINT players_wins_check CHECK ((wins >= 0))
);


ALTER TABLE public.players OWNER TO postgres;

--
-- TOC entry 355 (class 1259 OID 18106)
-- Name: prize_distribution; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.prize_distribution (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    tournament_id uuid NOT NULL,
    placement integer NOT NULL,
    description text NOT NULL,
    value text NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT prize_distribution_placement_check CHECK ((placement >= 1))
);


ALTER TABLE public.prize_distribution OWNER TO postgres;

--
-- TOC entry 345 (class 1259 OID 17681)
-- Name: profiles; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.profiles (
    id uuid NOT NULL,
    email text NOT NULL,
    full_name text,
    avatar_url text,
    is_admin boolean DEFAULT false NOT NULL,
    is_banned boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    riot_game_name text,
    riot_tag_line text
);


ALTER TABLE public.profiles OWNER TO postgres;

--
-- TOC entry 371 (class 1259 OID 18464)
-- Name: rank_snapshots; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.rank_snapshots (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    riot_account_id uuid NOT NULL,
    queue_type text NOT NULL,
    tier text NOT NULL,
    rank text NOT NULL,
    lp integer DEFAULT 0 NOT NULL,
    wins integer DEFAULT 0 NOT NULL,
    losses integer DEFAULT 0 NOT NULL,
    hot_streak boolean DEFAULT false NOT NULL,
    snapshotted_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.rank_snapshots OWNER TO postgres;

--
-- TOC entry 370 (class 1259 OID 18442)
-- Name: riot_accounts; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.riot_accounts (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    profile_id uuid NOT NULL,
    puuid text NOT NULL,
    game_name text NOT NULL,
    tagline text NOT NULL,
    summoner_id text,
    summoner_level integer,
    profile_icon_id integer,
    is_primary boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    tag_line text
);


ALTER TABLE public.riot_accounts OWNER TO postgres;

--
-- TOC entry 356 (class 1259 OID 18121)
-- Name: seedings; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.seedings (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    tournament_id uuid NOT NULL,
    team_id uuid NOT NULL,
    seed integer NOT NULL,
    method text DEFAULT 'MANUAL'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT seedings_method_check CHECK ((method = ANY (ARRAY['MANUAL'::text, 'RANKING'::text, 'RANDOM'::text]))),
    CONSTRAINT seedings_seed_check CHECK ((seed >= 1))
);


ALTER TABLE public.seedings OWNER TO postgres;

--
-- TOC entry 357 (class 1259 OID 18157)
-- Name: team_invites; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.team_invites (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    team_id uuid NOT NULL,
    invited_by uuid,
    summoner_name text NOT NULL,
    tag_line text DEFAULT 'BR1'::text NOT NULL,
    role public.player_role,
    status public.invite_status DEFAULT 'PENDING'::public.invite_status,
    expires_at timestamp with time zone DEFAULT (now() + '48:00:00'::interval),
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.team_invites OWNER TO postgres;

--
-- TOC entry 347 (class 1259 OID 17718)
-- Name: teams; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.teams (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    tournament_id uuid NOT NULL,
    name text NOT NULL,
    tag text NOT NULL,
    logo_url text,
    owner_id uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    is_eliminated boolean DEFAULT false NOT NULL,
    CONSTRAINT teams_tag_check CHECK (((length(tag) >= 1) AND (length(tag) <= 6)))
);


ALTER TABLE public.teams OWNER TO postgres;

--
-- TOC entry 359 (class 1259 OID 18215)
-- Name: tournament_rules; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.tournament_rules (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    tournament_id uuid NOT NULL,
    section text NOT NULL,
    content text NOT NULL,
    rule_order integer DEFAULT 1,
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.tournament_rules OWNER TO postgres;

--
-- TOC entry 351 (class 1259 OID 17867)
-- Name: tournament_stages; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.tournament_stages (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    tournament_id uuid NOT NULL,
    name text NOT NULL,
    stage_order integer DEFAULT 1 NOT NULL,
    bracket_type public.bracket_type,
    best_of integer DEFAULT 1 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT tournament_stages_best_of_check CHECK ((best_of = ANY (ARRAY[1, 3, 5])))
);


ALTER TABLE public.tournament_stages OWNER TO postgres;

--
-- TOC entry 346 (class 1259 OID 17699)
-- Name: tournaments; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.tournaments (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    name text NOT NULL,
    description text,
    status text DEFAULT 'DRAFT'::public.tournament_status NOT NULL,
    bracket_type public.bracket_type DEFAULT 'SINGLE_ELIMINATION'::public.bracket_type NOT NULL,
    max_teams integer DEFAULT 8 NOT NULL,
    prize_pool text,
    start_date timestamp with time zone,
    end_date timestamp with time zone,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    min_tier text,
    discord_webhook_url text,
    slug text NOT NULL,
    featured boolean DEFAULT false,
    banner_url text,
    registration_deadline timestamp with time zone,
    starts_at timestamp with time zone GENERATED ALWAYS AS (start_date) STORED,
    CONSTRAINT tournaments_max_teams_check CHECK ((max_teams >= 2))
);


ALTER TABLE public.tournaments OWNER TO postgres;

--
-- TOC entry 344 (class 1259 OID 17529)
-- Name: messages; Type: TABLE; Schema: realtime; Owner: supabase_realtime_admin
--

CREATE TABLE realtime.messages (
    topic text NOT NULL,
    extension text NOT NULL,
    payload jsonb,
    event text,
    private boolean DEFAULT false,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    inserted_at timestamp without time zone DEFAULT now() NOT NULL,
    id uuid DEFAULT gen_random_uuid() NOT NULL
)
PARTITION BY RANGE (inserted_at);


ALTER TABLE realtime.messages OWNER TO supabase_realtime_admin;

--
-- TOC entry 373 (class 1259 OID 18542)
-- Name: messages_2026_04_22; Type: TABLE; Schema: realtime; Owner: supabase_admin
--

CREATE TABLE realtime.messages_2026_04_22 (
    topic text NOT NULL,
    extension text NOT NULL,
    payload jsonb,
    event text,
    private boolean DEFAULT false,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    inserted_at timestamp without time zone DEFAULT now() NOT NULL,
    id uuid DEFAULT gen_random_uuid() NOT NULL
);


ALTER TABLE realtime.messages_2026_04_22 OWNER TO supabase_admin;

--
-- TOC entry 374 (class 1259 OID 18554)
-- Name: messages_2026_04_23; Type: TABLE; Schema: realtime; Owner: supabase_admin
--

CREATE TABLE realtime.messages_2026_04_23 (
    topic text NOT NULL,
    extension text NOT NULL,
    payload jsonb,
    event text,
    private boolean DEFAULT false,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    inserted_at timestamp without time zone DEFAULT now() NOT NULL,
    id uuid DEFAULT gen_random_uuid() NOT NULL
);


ALTER TABLE realtime.messages_2026_04_23 OWNER TO supabase_admin;

--
-- TOC entry 375 (class 1259 OID 18566)
-- Name: messages_2026_04_24; Type: TABLE; Schema: realtime; Owner: supabase_admin
--

CREATE TABLE realtime.messages_2026_04_24 (
    topic text NOT NULL,
    extension text NOT NULL,
    payload jsonb,
    event text,
    private boolean DEFAULT false,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    inserted_at timestamp without time zone DEFAULT now() NOT NULL,
    id uuid DEFAULT gen_random_uuid() NOT NULL
);


ALTER TABLE realtime.messages_2026_04_24 OWNER TO supabase_admin;

--
-- TOC entry 376 (class 1259 OID 18578)
-- Name: messages_2026_04_25; Type: TABLE; Schema: realtime; Owner: supabase_admin
--

CREATE TABLE realtime.messages_2026_04_25 (
    topic text NOT NULL,
    extension text NOT NULL,
    payload jsonb,
    event text,
    private boolean DEFAULT false,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    inserted_at timestamp without time zone DEFAULT now() NOT NULL,
    id uuid DEFAULT gen_random_uuid() NOT NULL
);


ALTER TABLE realtime.messages_2026_04_25 OWNER TO supabase_admin;

--
-- TOC entry 377 (class 1259 OID 18590)
-- Name: messages_2026_04_26; Type: TABLE; Schema: realtime; Owner: supabase_admin
--

CREATE TABLE realtime.messages_2026_04_26 (
    topic text NOT NULL,
    extension text NOT NULL,
    payload jsonb,
    event text,
    private boolean DEFAULT false,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    inserted_at timestamp without time zone DEFAULT now() NOT NULL,
    id uuid DEFAULT gen_random_uuid() NOT NULL
);


ALTER TABLE realtime.messages_2026_04_26 OWNER TO supabase_admin;

--
-- TOC entry 378 (class 1259 OID 18613)
-- Name: messages_2026_04_27; Type: TABLE; Schema: realtime; Owner: supabase_admin
--

CREATE TABLE realtime.messages_2026_04_27 (
    topic text NOT NULL,
    extension text NOT NULL,
    payload jsonb,
    event text,
    private boolean DEFAULT false,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    inserted_at timestamp without time zone DEFAULT now() NOT NULL,
    id uuid DEFAULT gen_random_uuid() NOT NULL
);


ALTER TABLE realtime.messages_2026_04_27 OWNER TO supabase_admin;

--
-- TOC entry 379 (class 1259 OID 18708)
-- Name: messages_2026_04_28; Type: TABLE; Schema: realtime; Owner: supabase_admin
--

CREATE TABLE realtime.messages_2026_04_28 (
    topic text NOT NULL,
    extension text NOT NULL,
    payload jsonb,
    event text,
    private boolean DEFAULT false,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    inserted_at timestamp without time zone DEFAULT now() NOT NULL,
    id uuid DEFAULT gen_random_uuid() NOT NULL
);


ALTER TABLE realtime.messages_2026_04_28 OWNER TO supabase_admin;

--
-- TOC entry 338 (class 1259 OID 17366)
-- Name: schema_migrations; Type: TABLE; Schema: realtime; Owner: supabase_admin
--

CREATE TABLE realtime.schema_migrations (
    version bigint NOT NULL,
    inserted_at timestamp(0) without time zone
);


ALTER TABLE realtime.schema_migrations OWNER TO supabase_admin;

--
-- TOC entry 341 (class 1259 OID 17389)
-- Name: subscription; Type: TABLE; Schema: realtime; Owner: supabase_admin
--

CREATE TABLE realtime.subscription (
    id bigint NOT NULL,
    subscription_id uuid NOT NULL,
    entity regclass NOT NULL,
    filters realtime.user_defined_filter[] DEFAULT '{}'::realtime.user_defined_filter[] NOT NULL,
    claims jsonb NOT NULL,
    claims_role regrole GENERATED ALWAYS AS (realtime.to_regrole((claims ->> 'role'::text))) STORED NOT NULL,
    created_at timestamp without time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    action_filter text DEFAULT '*'::text,
    CONSTRAINT subscription_action_filter_check CHECK ((action_filter = ANY (ARRAY['*'::text, 'INSERT'::text, 'UPDATE'::text, 'DELETE'::text])))
);


ALTER TABLE realtime.subscription OWNER TO supabase_admin;

--
-- TOC entry 340 (class 1259 OID 17388)
-- Name: subscription_id_seq; Type: SEQUENCE; Schema: realtime; Owner: supabase_admin
--

ALTER TABLE realtime.subscription ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME realtime.subscription_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- TOC entry 331 (class 1259 OID 17176)
-- Name: buckets; Type: TABLE; Schema: storage; Owner: supabase_storage_admin
--

CREATE TABLE storage.buckets (
    id text NOT NULL,
    name text NOT NULL,
    owner uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    public boolean DEFAULT false,
    avif_autodetection boolean DEFAULT false,
    file_size_limit bigint,
    allowed_mime_types text[],
    owner_id text,
    type storage.buckettype DEFAULT 'STANDARD'::storage.buckettype NOT NULL
);


ALTER TABLE storage.buckets OWNER TO supabase_storage_admin;

--
-- TOC entry 5059 (class 0 OID 0)
-- Dependencies: 331
-- Name: COLUMN buckets.owner; Type: COMMENT; Schema: storage; Owner: supabase_storage_admin
--

COMMENT ON COLUMN storage.buckets.owner IS 'Field is deprecated, use owner_id instead';


--
-- TOC entry 335 (class 1259 OID 17296)
-- Name: buckets_analytics; Type: TABLE; Schema: storage; Owner: supabase_storage_admin
--

CREATE TABLE storage.buckets_analytics (
    name text NOT NULL,
    type storage.buckettype DEFAULT 'ANALYTICS'::storage.buckettype NOT NULL,
    format text DEFAULT 'ICEBERG'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    deleted_at timestamp with time zone
);


ALTER TABLE storage.buckets_analytics OWNER TO supabase_storage_admin;

--
-- TOC entry 336 (class 1259 OID 17309)
-- Name: buckets_vectors; Type: TABLE; Schema: storage; Owner: supabase_storage_admin
--

CREATE TABLE storage.buckets_vectors (
    id text NOT NULL,
    type storage.buckettype DEFAULT 'VECTOR'::storage.buckettype NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE storage.buckets_vectors OWNER TO supabase_storage_admin;

--
-- TOC entry 330 (class 1259 OID 17168)
-- Name: migrations; Type: TABLE; Schema: storage; Owner: supabase_storage_admin
--

CREATE TABLE storage.migrations (
    id integer NOT NULL,
    name character varying(100) NOT NULL,
    hash character varying(40) NOT NULL,
    executed_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE storage.migrations OWNER TO supabase_storage_admin;

--
-- TOC entry 332 (class 1259 OID 17186)
-- Name: objects; Type: TABLE; Schema: storage; Owner: supabase_storage_admin
--

CREATE TABLE storage.objects (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    bucket_id text,
    name text,
    owner uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    last_accessed_at timestamp with time zone DEFAULT now(),
    metadata jsonb,
    path_tokens text[] GENERATED ALWAYS AS (string_to_array(name, '/'::text)) STORED,
    version text,
    owner_id text,
    user_metadata jsonb
);


ALTER TABLE storage.objects OWNER TO supabase_storage_admin;

--
-- TOC entry 5063 (class 0 OID 0)
-- Dependencies: 332
-- Name: COLUMN objects.owner; Type: COMMENT; Schema: storage; Owner: supabase_storage_admin
--

COMMENT ON COLUMN storage.objects.owner IS 'Field is deprecated, use owner_id instead';


--
-- TOC entry 333 (class 1259 OID 17235)
-- Name: s3_multipart_uploads; Type: TABLE; Schema: storage; Owner: supabase_storage_admin
--

CREATE TABLE storage.s3_multipart_uploads (
    id text NOT NULL,
    in_progress_size bigint DEFAULT 0 NOT NULL,
    upload_signature text NOT NULL,
    bucket_id text NOT NULL,
    key text NOT NULL COLLATE pg_catalog."C",
    version text NOT NULL,
    owner_id text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    user_metadata jsonb,
    metadata jsonb
);


ALTER TABLE storage.s3_multipart_uploads OWNER TO supabase_storage_admin;

--
-- TOC entry 334 (class 1259 OID 17249)
-- Name: s3_multipart_uploads_parts; Type: TABLE; Schema: storage; Owner: supabase_storage_admin
--

CREATE TABLE storage.s3_multipart_uploads_parts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    upload_id text NOT NULL,
    size bigint DEFAULT 0 NOT NULL,
    part_number integer NOT NULL,
    bucket_id text NOT NULL,
    key text NOT NULL COLLATE pg_catalog."C",
    etag text NOT NULL,
    owner_id text,
    version text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE storage.s3_multipart_uploads_parts OWNER TO supabase_storage_admin;

--
-- TOC entry 337 (class 1259 OID 17319)
-- Name: vector_indexes; Type: TABLE; Schema: storage; Owner: supabase_storage_admin
--

CREATE TABLE storage.vector_indexes (
    id text DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL COLLATE pg_catalog."C",
    bucket_id text NOT NULL,
    data_type text NOT NULL,
    dimension integer NOT NULL,
    distance_metric text NOT NULL,
    metadata_configuration jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE storage.vector_indexes OWNER TO supabase_storage_admin;

--
-- TOC entry 361 (class 1259 OID 18257)
-- Name: schema_migrations; Type: TABLE; Schema: supabase_migrations; Owner: postgres
--

CREATE TABLE supabase_migrations.schema_migrations (
    version text NOT NULL,
    statements text[],
    name text,
    created_by text,
    idempotency_key text,
    rollback text[]
);


ALTER TABLE supabase_migrations.schema_migrations OWNER TO postgres;

--
-- TOC entry 3820 (class 0 OID 0)
-- Name: messages_2026_04_22; Type: TABLE ATTACH; Schema: realtime; Owner: supabase_admin
--

ALTER TABLE ONLY realtime.messages ATTACH PARTITION realtime.messages_2026_04_22 FOR VALUES FROM ('2026-04-22 00:00:00') TO ('2026-04-23 00:00:00');


--
-- TOC entry 3821 (class 0 OID 0)
-- Name: messages_2026_04_23; Type: TABLE ATTACH; Schema: realtime; Owner: supabase_admin
--

ALTER TABLE ONLY realtime.messages ATTACH PARTITION realtime.messages_2026_04_23 FOR VALUES FROM ('2026-04-23 00:00:00') TO ('2026-04-24 00:00:00');


--
-- TOC entry 3822 (class 0 OID 0)
-- Name: messages_2026_04_24; Type: TABLE ATTACH; Schema: realtime; Owner: supabase_admin
--

ALTER TABLE ONLY realtime.messages ATTACH PARTITION realtime.messages_2026_04_24 FOR VALUES FROM ('2026-04-24 00:00:00') TO ('2026-04-25 00:00:00');


--
-- TOC entry 3823 (class 0 OID 0)
-- Name: messages_2026_04_25; Type: TABLE ATTACH; Schema: realtime; Owner: supabase_admin
--

ALTER TABLE ONLY realtime.messages ATTACH PARTITION realtime.messages_2026_04_25 FOR VALUES FROM ('2026-04-25 00:00:00') TO ('2026-04-26 00:00:00');


--
-- TOC entry 3824 (class 0 OID 0)
-- Name: messages_2026_04_26; Type: TABLE ATTACH; Schema: realtime; Owner: supabase_admin
--

ALTER TABLE ONLY realtime.messages ATTACH PARTITION realtime.messages_2026_04_26 FOR VALUES FROM ('2026-04-26 00:00:00') TO ('2026-04-27 00:00:00');


--
-- TOC entry 3825 (class 0 OID 0)
-- Name: messages_2026_04_27; Type: TABLE ATTACH; Schema: realtime; Owner: supabase_admin
--

ALTER TABLE ONLY realtime.messages ATTACH PARTITION realtime.messages_2026_04_27 FOR VALUES FROM ('2026-04-27 00:00:00') TO ('2026-04-28 00:00:00');


--
-- TOC entry 3826 (class 0 OID 0)
-- Name: messages_2026_04_28; Type: TABLE ATTACH; Schema: realtime; Owner: supabase_admin
--

ALTER TABLE ONLY realtime.messages ATTACH PARTITION realtime.messages_2026_04_28 FOR VALUES FROM ('2026-04-28 00:00:00') TO ('2026-04-29 00:00:00');


--
-- TOC entry 3836 (class 2604 OID 16514)
-- Name: refresh_tokens id; Type: DEFAULT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.refresh_tokens ALTER COLUMN id SET DEFAULT nextval('auth.refresh_tokens_id_seq'::regclass);


--
-- TOC entry 4387 (class 2606 OID 16787)
-- Name: mfa_amr_claims amr_id_pk; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.mfa_amr_claims
    ADD CONSTRAINT amr_id_pk PRIMARY KEY (id);


--
-- TOC entry 4356 (class 2606 OID 16535)
-- Name: audit_log_entries audit_log_entries_pkey; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.audit_log_entries
    ADD CONSTRAINT audit_log_entries_pkey PRIMARY KEY (id);


--
-- TOC entry 4442 (class 2606 OID 17119)
-- Name: custom_oauth_providers custom_oauth_providers_identifier_key; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.custom_oauth_providers
    ADD CONSTRAINT custom_oauth_providers_identifier_key UNIQUE (identifier);


--
-- TOC entry 4444 (class 2606 OID 17117)
-- Name: custom_oauth_providers custom_oauth_providers_pkey; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.custom_oauth_providers
    ADD CONSTRAINT custom_oauth_providers_pkey PRIMARY KEY (id);


--
-- TOC entry 4410 (class 2606 OID 16893)
-- Name: flow_state flow_state_pkey; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.flow_state
    ADD CONSTRAINT flow_state_pkey PRIMARY KEY (id);


--
-- TOC entry 4365 (class 2606 OID 16911)
-- Name: identities identities_pkey; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.identities
    ADD CONSTRAINT identities_pkey PRIMARY KEY (id);


--
-- TOC entry 4367 (class 2606 OID 16921)
-- Name: identities identities_provider_id_provider_unique; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.identities
    ADD CONSTRAINT identities_provider_id_provider_unique UNIQUE (provider_id, provider);


--
-- TOC entry 4354 (class 2606 OID 16528)
-- Name: instances instances_pkey; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.instances
    ADD CONSTRAINT instances_pkey PRIMARY KEY (id);


--
-- TOC entry 4389 (class 2606 OID 16780)
-- Name: mfa_amr_claims mfa_amr_claims_session_id_authentication_method_pkey; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.mfa_amr_claims
    ADD CONSTRAINT mfa_amr_claims_session_id_authentication_method_pkey UNIQUE (session_id, authentication_method);


--
-- TOC entry 4385 (class 2606 OID 16768)
-- Name: mfa_challenges mfa_challenges_pkey; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.mfa_challenges
    ADD CONSTRAINT mfa_challenges_pkey PRIMARY KEY (id);


--
-- TOC entry 4377 (class 2606 OID 16961)
-- Name: mfa_factors mfa_factors_last_challenged_at_key; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.mfa_factors
    ADD CONSTRAINT mfa_factors_last_challenged_at_key UNIQUE (last_challenged_at);


--
-- TOC entry 4379 (class 2606 OID 16755)
-- Name: mfa_factors mfa_factors_pkey; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.mfa_factors
    ADD CONSTRAINT mfa_factors_pkey PRIMARY KEY (id);


--
-- TOC entry 4423 (class 2606 OID 17020)
-- Name: oauth_authorizations oauth_authorizations_authorization_code_key; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.oauth_authorizations
    ADD CONSTRAINT oauth_authorizations_authorization_code_key UNIQUE (authorization_code);


--
-- TOC entry 4425 (class 2606 OID 17018)
-- Name: oauth_authorizations oauth_authorizations_authorization_id_key; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.oauth_authorizations
    ADD CONSTRAINT oauth_authorizations_authorization_id_key UNIQUE (authorization_id);


--
-- TOC entry 4427 (class 2606 OID 17016)
-- Name: oauth_authorizations oauth_authorizations_pkey; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.oauth_authorizations
    ADD CONSTRAINT oauth_authorizations_pkey PRIMARY KEY (id);


--
-- TOC entry 4437 (class 2606 OID 17078)
-- Name: oauth_client_states oauth_client_states_pkey; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.oauth_client_states
    ADD CONSTRAINT oauth_client_states_pkey PRIMARY KEY (id);


--
-- TOC entry 4420 (class 2606 OID 16980)
-- Name: oauth_clients oauth_clients_pkey; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.oauth_clients
    ADD CONSTRAINT oauth_clients_pkey PRIMARY KEY (id);


--
-- TOC entry 4431 (class 2606 OID 17042)
-- Name: oauth_consents oauth_consents_pkey; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.oauth_consents
    ADD CONSTRAINT oauth_consents_pkey PRIMARY KEY (id);


--
-- TOC entry 4433 (class 2606 OID 17044)
-- Name: oauth_consents oauth_consents_user_client_unique; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.oauth_consents
    ADD CONSTRAINT oauth_consents_user_client_unique UNIQUE (user_id, client_id);


--
-- TOC entry 4414 (class 2606 OID 16946)
-- Name: one_time_tokens one_time_tokens_pkey; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.one_time_tokens
    ADD CONSTRAINT one_time_tokens_pkey PRIMARY KEY (id);


--
-- TOC entry 4348 (class 2606 OID 16518)
-- Name: refresh_tokens refresh_tokens_pkey; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.refresh_tokens
    ADD CONSTRAINT refresh_tokens_pkey PRIMARY KEY (id);


--
-- TOC entry 4351 (class 2606 OID 16697)
-- Name: refresh_tokens refresh_tokens_token_unique; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.refresh_tokens
    ADD CONSTRAINT refresh_tokens_token_unique UNIQUE (token);


--
-- TOC entry 4399 (class 2606 OID 16827)
-- Name: saml_providers saml_providers_entity_id_key; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.saml_providers
    ADD CONSTRAINT saml_providers_entity_id_key UNIQUE (entity_id);


--
-- TOC entry 4401 (class 2606 OID 16825)
-- Name: saml_providers saml_providers_pkey; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.saml_providers
    ADD CONSTRAINT saml_providers_pkey PRIMARY KEY (id);


--
-- TOC entry 4406 (class 2606 OID 16841)
-- Name: saml_relay_states saml_relay_states_pkey; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.saml_relay_states
    ADD CONSTRAINT saml_relay_states_pkey PRIMARY KEY (id);


--
-- TOC entry 4359 (class 2606 OID 16541)
-- Name: schema_migrations schema_migrations_pkey; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.schema_migrations
    ADD CONSTRAINT schema_migrations_pkey PRIMARY KEY (version);


--
-- TOC entry 4372 (class 2606 OID 16718)
-- Name: sessions sessions_pkey; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.sessions
    ADD CONSTRAINT sessions_pkey PRIMARY KEY (id);


--
-- TOC entry 4396 (class 2606 OID 16808)
-- Name: sso_domains sso_domains_pkey; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.sso_domains
    ADD CONSTRAINT sso_domains_pkey PRIMARY KEY (id);


--
-- TOC entry 4391 (class 2606 OID 16799)
-- Name: sso_providers sso_providers_pkey; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.sso_providers
    ADD CONSTRAINT sso_providers_pkey PRIMARY KEY (id);


--
-- TOC entry 4341 (class 2606 OID 16881)
-- Name: users users_phone_key; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.users
    ADD CONSTRAINT users_phone_key UNIQUE (phone);


--
-- TOC entry 4343 (class 2606 OID 16505)
-- Name: users users_pkey; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- TOC entry 4452 (class 2606 OID 17156)
-- Name: webauthn_challenges webauthn_challenges_pkey; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.webauthn_challenges
    ADD CONSTRAINT webauthn_challenges_pkey PRIMARY KEY (id);


--
-- TOC entry 4448 (class 2606 OID 17139)
-- Name: webauthn_credentials webauthn_credentials_pkey; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.webauthn_credentials
    ADD CONSTRAINT webauthn_credentials_pkey PRIMARY KEY (id);


--
-- TOC entry 4152 (class 2606 OID 10146)
-- Name: pg_aggregate pg_aggregate_fnoid_index; Type: CONSTRAINT; Schema: pg_catalog; Owner: supabase_admin
--

ALTER TABLE ONLY pg_catalog.pg_aggregate
    ADD CONSTRAINT pg_aggregate_fnoid_index PRIMARY KEY (aggfnoid);


--
-- TOC entry 4154 (class 2606 OID 10135)
-- Name: pg_am pg_am_name_index; Type: CONSTRAINT; Schema: pg_catalog; Owner: supabase_admin
--

ALTER TABLE ONLY pg_catalog.pg_am
    ADD CONSTRAINT pg_am_name_index UNIQUE (amname);


--
-- TOC entry 4156 (class 2606 OID 10136)
-- Name: pg_am pg_am_oid_index; Type: CONSTRAINT; Schema: pg_catalog; Owner: supabase_admin
--

ALTER TABLE ONLY pg_catalog.pg_am
    ADD CONSTRAINT pg_am_oid_index PRIMARY KEY (oid);


--
-- TOC entry 4158 (class 2606 OID 10137)
-- Name: pg_amop pg_amop_fam_strat_index; Type: CONSTRAINT; Schema: pg_catalog; Owner: supabase_admin
--

ALTER TABLE ONLY pg_catalog.pg_amop
    ADD CONSTRAINT pg_amop_fam_strat_index UNIQUE (amopfamily, amoplefttype, amoprighttype, amopstrategy);


--
-- TOC entry 4160 (class 2606 OID 10139)
-- Name: pg_amop pg_amop_oid_index; Type: CONSTRAINT; Schema: pg_catalog; Owner: supabase_admin
--

ALTER TABLE ONLY pg_catalog.pg_amop
    ADD CONSTRAINT pg_amop_oid_index PRIMARY KEY (oid);


--
-- TOC entry 4162 (class 2606 OID 10138)
-- Name: pg_amop pg_amop_opr_fam_index; Type: CONSTRAINT; Schema: pg_catalog; Owner: supabase_admin
--

ALTER TABLE ONLY pg_catalog.pg_amop
    ADD CONSTRAINT pg_amop_opr_fam_index UNIQUE (amopopr, amoppurpose, amopfamily);


--
-- TOC entry 4164 (class 2606 OID 10140)
-- Name: pg_amproc pg_amproc_fam_proc_index; Type: CONSTRAINT; Schema: pg_catalog; Owner: supabase_admin
--

ALTER TABLE ONLY pg_catalog.pg_amproc
    ADD CONSTRAINT pg_amproc_fam_proc_index UNIQUE (amprocfamily, amproclefttype, amprocrighttype, amprocnum);


--
-- TOC entry 4166 (class 2606 OID 10141)
-- Name: pg_amproc pg_amproc_oid_index; Type: CONSTRAINT; Schema: pg_catalog; Owner: supabase_admin
--

ALTER TABLE ONLY pg_catalog.pg_amproc
    ADD CONSTRAINT pg_amproc_oid_index PRIMARY KEY (oid);


--
-- TOC entry 4168 (class 2606 OID 10123)
-- Name: pg_attrdef pg_attrdef_adrelid_adnum_index; Type: CONSTRAINT; Schema: pg_catalog; Owner: supabase_admin
--

ALTER TABLE ONLY pg_catalog.pg_attrdef
    ADD CONSTRAINT pg_attrdef_adrelid_adnum_index UNIQUE (adrelid, adnum);


--
-- TOC entry 4170 (class 2606 OID 10124)
-- Name: pg_attrdef pg_attrdef_oid_index; Type: CONSTRAINT; Schema: pg_catalog; Owner: supabase_admin
--

ALTER TABLE ONLY pg_catalog.pg_attrdef
    ADD CONSTRAINT pg_attrdef_oid_index PRIMARY KEY (oid);


--
-- TOC entry 4108 (class 2606 OID 10119)
-- Name: pg_attribute pg_attribute_relid_attnam_index; Type: CONSTRAINT; Schema: pg_catalog; Owner: supabase_admin
--

ALTER TABLE ONLY pg_catalog.pg_attribute
    ADD CONSTRAINT pg_attribute_relid_attnam_index UNIQUE (attrelid, attname);


--
-- TOC entry 4110 (class 2606 OID 10120)
-- Name: pg_attribute pg_attribute_relid_attnum_index; Type: CONSTRAINT; Schema: pg_catalog; Owner: supabase_admin
--

ALTER TABLE ONLY pg_catalog.pg_attribute
    ADD CONSTRAINT pg_attribute_relid_attnum_index PRIMARY KEY (attrelid, attnum);


SET default_tablespace = pg_global;

--
-- TOC entry 4126 (class 2606 OID 10177)
-- Name: pg_auth_members pg_auth_members_member_role_index; Type: CONSTRAINT; Schema: pg_catalog; Owner: supabase_admin; Tablespace: pg_global
--

ALTER TABLE ONLY pg_catalog.pg_auth_members
    ADD CONSTRAINT pg_auth_members_member_role_index UNIQUE (member, roleid, grantor);


--
-- TOC entry 4128 (class 2606 OID 10175)
-- Name: pg_auth_members pg_auth_members_oid_index; Type: CONSTRAINT; Schema: pg_catalog; Owner: supabase_admin; Tablespace: pg_global
--

ALTER TABLE ONLY pg_catalog.pg_auth_members
    ADD CONSTRAINT pg_auth_members_oid_index PRIMARY KEY (oid);


--
-- TOC entry 4130 (class 2606 OID 10176)
-- Name: pg_auth_members pg_auth_members_role_member_index; Type: CONSTRAINT; Schema: pg_catalog; Owner: supabase_admin; Tablespace: pg_global
--

ALTER TABLE ONLY pg_catalog.pg_auth_members
    ADD CONSTRAINT pg_auth_members_role_member_index UNIQUE (roleid, member, grantor);


--
-- TOC entry 4121 (class 2606 OID 10174)
-- Name: pg_authid pg_authid_oid_index; Type: CONSTRAINT; Schema: pg_catalog; Owner: supabase_admin; Tablespace: pg_global
--

ALTER TABLE ONLY pg_catalog.pg_authid
    ADD CONSTRAINT pg_authid_oid_index PRIMARY KEY (oid);


--
-- TOC entry 4123 (class 2606 OID 10173)
-- Name: pg_authid pg_authid_rolname_index; Type: CONSTRAINT; Schema: pg_catalog; Owner: supabase_admin; Tablespace: pg_global
--

ALTER TABLE ONLY pg_catalog.pg_authid
    ADD CONSTRAINT pg_authid_rolname_index UNIQUE (rolname);


SET default_tablespace = '';

--
-- TOC entry 4172 (class 2606 OID 10158)
-- Name: pg_cast pg_cast_oid_index; Type: CONSTRAINT; Schema: pg_catalog; Owner: supabase_admin
--

ALTER TABLE ONLY pg_catalog.pg_cast
    ADD CONSTRAINT pg_cast_oid_index PRIMARY KEY (oid);


--
-- TOC entry 4174 (class 2606 OID 10159)
-- Name: pg_cast pg_cast_source_target_index; Type: CONSTRAINT; Schema: pg_catalog; Owner: supabase_admin
--

ALTER TABLE ONLY pg_catalog.pg_cast
    ADD CONSTRAINT pg_cast_source_target_index UNIQUE (castsource, casttarget);


--
-- TOC entry 4116 (class 2606 OID 10121)
-- Name: pg_class pg_class_oid_index; Type: CONSTRAINT; Schema: pg_catalog; Owner: supabase_admin
--

ALTER TABLE ONLY pg_catalog.pg_class
    ADD CONSTRAINT pg_class_oid_index PRIMARY KEY (oid);


--
-- TOC entry 4118 (class 2606 OID 10122)
-- Name: pg_class pg_class_relname_nsp_index; Type: CONSTRAINT; Schema: pg_catalog; Owner: supabase_admin
--

ALTER TABLE ONLY pg_catalog.pg_class
    ADD CONSTRAINT pg_class_relname_nsp_index UNIQUE (relname, relnamespace);


--
-- TOC entry 4257 (class 2606 OID 10206)
-- Name: pg_collation pg_collation_name_enc_nsp_index; Type: CONSTRAINT; Schema: pg_catalog; Owner: supabase_admin
--

ALTER TABLE ONLY pg_catalog.pg_collation
    ADD CONSTRAINT pg_collation_name_enc_nsp_index UNIQUE (collname, collencoding, collnamespace);


--
-- TOC entry 4259 (class 2606 OID 10207)
-- Name: pg_collation pg_collation_oid_index; Type: CONSTRAINT; Schema: pg_catalog; Owner: supabase_admin
--

ALTER TABLE ONLY pg_catalog.pg_collation
    ADD CONSTRAINT pg_collation_oid_index PRIMARY KEY (oid);


--
-- TOC entry 4178 (class 2606 OID 10125)
-- Name: pg_constraint pg_constraint_conrelid_contypid_conname_index; Type: CONSTRAINT; Schema: pg_catalog; Owner: supabase_admin
--

ALTER TABLE ONLY pg_catalog.pg_constraint
    ADD CONSTRAINT pg_constraint_conrelid_contypid_conname_index UNIQUE (conrelid, contypid, conname);


--
-- TOC entry 4181 (class 2606 OID 10126)
-- Name: pg_constraint pg_constraint_oid_index; Type: CONSTRAINT; Schema: pg_catalog; Owner: supabase_admin
--

ALTER TABLE ONLY pg_catalog.pg_constraint
    ADD CONSTRAINT pg_constraint_oid_index PRIMARY KEY (oid);


--
-- TOC entry 4183 (class 2606 OID 10165)
-- Name: pg_conversion pg_conversion_default_index; Type: CONSTRAINT; Schema: pg_catalog; Owner: supabase_admin
--

ALTER TABLE ONLY pg_catalog.pg_conversion
    ADD CONSTRAINT pg_conversion_default_index UNIQUE (connamespace, conforencoding, contoencoding, oid);


--
-- TOC entry 4185 (class 2606 OID 10166)
-- Name: pg_conversion pg_conversion_name_nsp_index; Type: CONSTRAINT; Schema: pg_catalog; Owner: supabase_admin
--

ALTER TABLE ONLY pg_catalog.pg_conversion
    ADD CONSTRAINT pg_conversion_name_nsp_index UNIQUE (conname, connamespace);


--
-- TOC entry 4187 (class 2606 OID 10167)
-- Name: pg_conversion pg_conversion_oid_index; Type: CONSTRAINT; Schema: pg_catalog; Owner: supabase_admin
--

ALTER TABLE ONLY pg_catalog.pg_conversion
    ADD CONSTRAINT pg_conversion_oid_index PRIMARY KEY (oid);


SET default_tablespace = pg_global;

--
-- TOC entry 4132 (class 2606 OID 10168)
-- Name: pg_database pg_database_datname_index; Type: CONSTRAINT; Schema: pg_catalog; Owner: supabase_admin; Tablespace: pg_global
--

ALTER TABLE ONLY pg_catalog.pg_database
    ADD CONSTRAINT pg_database_datname_index UNIQUE (datname);


--
-- TOC entry 4134 (class 2606 OID 10169)
-- Name: pg_database pg_database_oid_index; Type: CONSTRAINT; Schema: pg_catalog; Owner: supabase_admin; Tablespace: pg_global
--

ALTER TABLE ONLY pg_catalog.pg_database
    ADD CONSTRAINT pg_database_oid_index PRIMARY KEY (oid);


--
-- TOC entry 4232 (class 2606 OID 10170)
-- Name: pg_db_role_setting pg_db_role_setting_databaseid_rol_index; Type: CONSTRAINT; Schema: pg_catalog; Owner: supabase_admin; Tablespace: pg_global
--

ALTER TABLE ONLY pg_catalog.pg_db_role_setting
    ADD CONSTRAINT pg_db_role_setting_databaseid_rol_index PRIMARY KEY (setdatabase, setrole);


SET default_tablespace = '';

--
-- TOC entry 4094 (class 2606 OID 10202)
-- Name: pg_default_acl pg_default_acl_oid_index; Type: CONSTRAINT; Schema: pg_catalog; Owner: supabase_admin
--

ALTER TABLE ONLY pg_catalog.pg_default_acl
    ADD CONSTRAINT pg_default_acl_oid_index PRIMARY KEY (oid);


--
-- TOC entry 4096 (class 2606 OID 10201)
-- Name: pg_default_acl pg_default_acl_role_nsp_obj_index; Type: CONSTRAINT; Schema: pg_catalog; Owner: supabase_admin
--

ALTER TABLE ONLY pg_catalog.pg_default_acl
    ADD CONSTRAINT pg_default_acl_role_nsp_obj_index UNIQUE (defaclrole, defaclnamespace, defaclobjtype);


--
-- TOC entry 4191 (class 2606 OID 10157)
-- Name: pg_description pg_description_o_c_o_index; Type: CONSTRAINT; Schema: pg_catalog; Owner: supabase_admin
--

ALTER TABLE ONLY pg_catalog.pg_description
    ADD CONSTRAINT pg_description_o_c_o_index PRIMARY KEY (objoid, classoid, objsubid);


--
-- TOC entry 4265 (class 2606 OID 10160)
-- Name: pg_enum pg_enum_oid_index; Type: CONSTRAINT; Schema: pg_catalog; Owner: supabase_admin
--

ALTER TABLE ONLY pg_catalog.pg_enum
    ADD CONSTRAINT pg_enum_oid_index PRIMARY KEY (oid);


--
-- TOC entry 4267 (class 2606 OID 10161)
-- Name: pg_enum pg_enum_typid_label_index; Type: CONSTRAINT; Schema: pg_catalog; Owner: supabase_admin
--

ALTER TABLE ONLY pg_catalog.pg_enum
    ADD CONSTRAINT pg_enum_typid_label_index UNIQUE (enumtypid, enumlabel);


--
-- TOC entry 4269 (class 2606 OID 10162)
-- Name: pg_enum pg_enum_typid_sortorder_index; Type: CONSTRAINT; Schema: pg_catalog; Owner: supabase_admin
--

ALTER TABLE ONLY pg_catalog.pg_enum
    ADD CONSTRAINT pg_enum_typid_sortorder_index UNIQUE (enumtypid, enumsortorder);


--
-- TOC entry 4261 (class 2606 OID 10155)
-- Name: pg_event_trigger pg_event_trigger_evtname_index; Type: CONSTRAINT; Schema: pg_catalog; Owner: supabase_admin
--

ALTER TABLE ONLY pg_catalog.pg_event_trigger
    ADD CONSTRAINT pg_event_trigger_evtname_index UNIQUE (evtname);


--
-- TOC entry 4263 (class 2606 OID 10156)
-- Name: pg_event_trigger pg_event_trigger_oid_index; Type: CONSTRAINT; Schema: pg_catalog; Owner: supabase_admin
--

ALTER TABLE ONLY pg_catalog.pg_event_trigger
    ADD CONSTRAINT pg_event_trigger_oid_index PRIMARY KEY (oid);


--
-- TOC entry 4236 (class 2606 OID 10189)
-- Name: pg_extension pg_extension_name_index; Type: CONSTRAINT; Schema: pg_catalog; Owner: supabase_admin
--

ALTER TABLE ONLY pg_catalog.pg_extension
    ADD CONSTRAINT pg_extension_name_index UNIQUE (extname);


--
-- TOC entry 4238 (class 2606 OID 10188)
-- Name: pg_extension pg_extension_oid_index; Type: CONSTRAINT; Schema: pg_catalog; Owner: supabase_admin
--

ALTER TABLE ONLY pg_catalog.pg_extension
    ADD CONSTRAINT pg_extension_oid_index PRIMARY KEY (oid);


--
-- TOC entry 4146 (class 2606 OID 10191)
-- Name: pg_foreign_data_wrapper pg_foreign_data_wrapper_name_index; Type: CONSTRAINT; Schema: pg_catalog; Owner: supabase_admin
--

ALTER TABLE ONLY pg_catalog.pg_foreign_data_wrapper
    ADD CONSTRAINT pg_foreign_data_wrapper_name_index UNIQUE (fdwname);


--
-- TOC entry 4148 (class 2606 OID 10190)
-- Name: pg_foreign_data_wrapper pg_foreign_data_wrapper_oid_index; Type: CONSTRAINT; Schema: pg_catalog; Owner: supabase_admin
--

ALTER TABLE ONLY pg_catalog.pg_foreign_data_wrapper
    ADD CONSTRAINT pg_foreign_data_wrapper_oid_index PRIMARY KEY (oid);


--
-- TOC entry 4136 (class 2606 OID 10193)
-- Name: pg_foreign_server pg_foreign_server_name_index; Type: CONSTRAINT; Schema: pg_catalog; Owner: supabase_admin
--

ALTER TABLE ONLY pg_catalog.pg_foreign_server
    ADD CONSTRAINT pg_foreign_server_name_index UNIQUE (srvname);


--
-- TOC entry 4138 (class 2606 OID 10192)
-- Name: pg_foreign_server pg_foreign_server_oid_index; Type: CONSTRAINT; Schema: pg_catalog; Owner: supabase_admin
--

ALTER TABLE ONLY pg_catalog.pg_foreign_server
    ADD CONSTRAINT pg_foreign_server_oid_index PRIMARY KEY (oid);


--
-- TOC entry 4240 (class 2606 OID 10196)
-- Name: pg_foreign_table pg_foreign_table_relid_index; Type: CONSTRAINT; Schema: pg_catalog; Owner: supabase_admin
--

ALTER TABLE ONLY pg_catalog.pg_foreign_table
    ADD CONSTRAINT pg_foreign_table_relid_index PRIMARY KEY (ftrelid);


--
-- TOC entry 4193 (class 2606 OID 10128)
-- Name: pg_index pg_index_indexrelid_index; Type: CONSTRAINT; Schema: pg_catalog; Owner: supabase_admin
--

ALTER TABLE ONLY pg_catalog.pg_index
    ADD CONSTRAINT pg_index_indexrelid_index PRIMARY KEY (indexrelid);


--
-- TOC entry 4197 (class 2606 OID 10127)
-- Name: pg_inherits pg_inherits_relid_seqno_index; Type: CONSTRAINT; Schema: pg_catalog; Owner: supabase_admin
--

ALTER TABLE ONLY pg_catalog.pg_inherits
    ADD CONSTRAINT pg_inherits_relid_seqno_index PRIMARY KEY (inhrelid, inhseqno);


--
-- TOC entry 4253 (class 2606 OID 10203)
-- Name: pg_init_privs pg_init_privs_o_c_o_index; Type: CONSTRAINT; Schema: pg_catalog; Owner: supabase_admin
--

ALTER TABLE ONLY pg_catalog.pg_init_privs
    ADD CONSTRAINT pg_init_privs_o_c_o_index PRIMARY KEY (objoid, classoid, objsubid);


--
-- TOC entry 4199 (class 2606 OID 10142)
-- Name: pg_language pg_language_name_index; Type: CONSTRAINT; Schema: pg_catalog; Owner: supabase_admin
--

ALTER TABLE ONLY pg_catalog.pg_language
    ADD CONSTRAINT pg_language_name_index UNIQUE (lanname);


--
-- TOC entry 4201 (class 2606 OID 10143)
-- Name: pg_language pg_language_oid_index; Type: CONSTRAINT; Schema: pg_catalog; Owner: supabase_admin
--

ALTER TABLE ONLY pg_catalog.pg_language
    ADD CONSTRAINT pg_language_oid_index PRIMARY KEY (oid);


--
-- TOC entry 4203 (class 2606 OID 10145)
-- Name: pg_largeobject pg_largeobject_loid_pn_index; Type: CONSTRAINT; Schema: pg_catalog; Owner: supabase_admin
--

ALTER TABLE ONLY pg_catalog.pg_largeobject
    ADD CONSTRAINT pg_largeobject_loid_pn_index PRIMARY KEY (loid, pageno);


--
-- TOC entry 4234 (class 2606 OID 10144)
-- Name: pg_largeobject_metadata pg_largeobject_metadata_oid_index; Type: CONSTRAINT; Schema: pg_catalog; Owner: supabase_admin
--

ALTER TABLE ONLY pg_catalog.pg_largeobject_metadata
    ADD CONSTRAINT pg_largeobject_metadata_oid_index PRIMARY KEY (oid);


--
-- TOC entry 4205 (class 2606 OID 10163)
-- Name: pg_namespace pg_namespace_nspname_index; Type: CONSTRAINT; Schema: pg_catalog; Owner: supabase_admin
--

ALTER TABLE ONLY pg_catalog.pg_namespace
    ADD CONSTRAINT pg_namespace_nspname_index UNIQUE (nspname);


--
-- TOC entry 4207 (class 2606 OID 10164)
-- Name: pg_namespace pg_namespace_oid_index; Type: CONSTRAINT; Schema: pg_catalog; Owner: supabase_admin
--

ALTER TABLE ONLY pg_catalog.pg_namespace
    ADD CONSTRAINT pg_namespace_oid_index PRIMARY KEY (oid);


--
-- TOC entry 4209 (class 2606 OID 10133)
-- Name: pg_opclass pg_opclass_am_name_nsp_index; Type: CONSTRAINT; Schema: pg_catalog; Owner: supabase_admin
--

ALTER TABLE ONLY pg_catalog.pg_opclass
    ADD CONSTRAINT pg_opclass_am_name_nsp_index UNIQUE (opcmethod, opcname, opcnamespace);


--
-- TOC entry 4211 (class 2606 OID 10134)
-- Name: pg_opclass pg_opclass_oid_index; Type: CONSTRAINT; Schema: pg_catalog; Owner: supabase_admin
--

ALTER TABLE ONLY pg_catalog.pg_opclass
    ADD CONSTRAINT pg_opclass_oid_index PRIMARY KEY (oid);


--
-- TOC entry 4213 (class 2606 OID 10129)
-- Name: pg_operator pg_operator_oid_index; Type: CONSTRAINT; Schema: pg_catalog; Owner: supabase_admin
--

ALTER TABLE ONLY pg_catalog.pg_operator
    ADD CONSTRAINT pg_operator_oid_index PRIMARY KEY (oid);


--
-- TOC entry 4215 (class 2606 OID 10130)
-- Name: pg_operator pg_operator_oprname_l_r_n_index; Type: CONSTRAINT; Schema: pg_catalog; Owner: supabase_admin
--

ALTER TABLE ONLY pg_catalog.pg_operator
    ADD CONSTRAINT pg_operator_oprname_l_r_n_index UNIQUE (oprname, oprleft, oprright, oprnamespace);


--
-- TOC entry 4228 (class 2606 OID 10131)
-- Name: pg_opfamily pg_opfamily_am_name_nsp_index; Type: CONSTRAINT; Schema: pg_catalog; Owner: supabase_admin
--

ALTER TABLE ONLY pg_catalog.pg_opfamily
    ADD CONSTRAINT pg_opfamily_am_name_nsp_index UNIQUE (opfmethod, opfname, opfnamespace);


--
-- TOC entry 4230 (class 2606 OID 10132)
-- Name: pg_opfamily pg_opfamily_oid_index; Type: CONSTRAINT; Schema: pg_catalog; Owner: supabase_admin
--

ALTER TABLE ONLY pg_catalog.pg_opfamily
    ADD CONSTRAINT pg_opfamily_oid_index PRIMARY KEY (oid);


SET default_tablespace = pg_global;

--
-- TOC entry 4324 (class 2606 OID 10209)
-- Name: pg_parameter_acl pg_parameter_acl_oid_index; Type: CONSTRAINT; Schema: pg_catalog; Owner: supabase_admin; Tablespace: pg_global
--

ALTER TABLE ONLY pg_catalog.pg_parameter_acl
    ADD CONSTRAINT pg_parameter_acl_oid_index PRIMARY KEY (oid);


--
-- TOC entry 4326 (class 2606 OID 10208)
-- Name: pg_parameter_acl pg_parameter_acl_parname_index; Type: CONSTRAINT; Schema: pg_catalog; Owner: supabase_admin; Tablespace: pg_global
--

ALTER TABLE ONLY pg_catalog.pg_parameter_acl
    ADD CONSTRAINT pg_parameter_acl_parname_index UNIQUE (parname);


SET default_tablespace = '';

--
-- TOC entry 4246 (class 2606 OID 10210)
-- Name: pg_partitioned_table pg_partitioned_table_partrelid_index; Type: CONSTRAINT; Schema: pg_catalog; Owner: supabase_admin
--

ALTER TABLE ONLY pg_catalog.pg_partitioned_table
    ADD CONSTRAINT pg_partitioned_table_partrelid_index PRIMARY KEY (partrelid);


--
-- TOC entry 4242 (class 2606 OID 10197)
-- Name: pg_policy pg_policy_oid_index; Type: CONSTRAINT; Schema: pg_catalog; Owner: supabase_admin
--

ALTER TABLE ONLY pg_catalog.pg_policy
    ADD CONSTRAINT pg_policy_oid_index PRIMARY KEY (oid);


--
-- TOC entry 4244 (class 2606 OID 10198)
-- Name: pg_policy pg_policy_polrelid_polname_index; Type: CONSTRAINT; Schema: pg_catalog; Owner: supabase_admin
--

ALTER TABLE ONLY pg_catalog.pg_policy
    ADD CONSTRAINT pg_policy_polrelid_polname_index UNIQUE (polrelid, polname);


--
-- TOC entry 4112 (class 2606 OID 10115)
-- Name: pg_proc pg_proc_oid_index; Type: CONSTRAINT; Schema: pg_catalog; Owner: supabase_admin
--

ALTER TABLE ONLY pg_catalog.pg_proc
    ADD CONSTRAINT pg_proc_oid_index PRIMARY KEY (oid);


--
-- TOC entry 4114 (class 2606 OID 10116)
-- Name: pg_proc pg_proc_proname_args_nsp_index; Type: CONSTRAINT; Schema: pg_catalog; Owner: supabase_admin
--

ALTER TABLE ONLY pg_catalog.pg_proc
    ADD CONSTRAINT pg_proc_proname_args_nsp_index UNIQUE (proname, proargtypes, pronamespace);


--
-- TOC entry 4320 (class 2606 OID 10218)
-- Name: pg_publication_namespace pg_publication_namespace_oid_index; Type: CONSTRAINT; Schema: pg_catalog; Owner: supabase_admin
--

ALTER TABLE ONLY pg_catalog.pg_publication_namespace
    ADD CONSTRAINT pg_publication_namespace_oid_index PRIMARY KEY (oid);


--
-- TOC entry 4322 (class 2606 OID 10219)
-- Name: pg_publication_namespace pg_publication_namespace_pnnspid_pnpubid_index; Type: CONSTRAINT; Schema: pg_catalog; Owner: supabase_admin
--

ALTER TABLE ONLY pg_catalog.pg_publication_namespace
    ADD CONSTRAINT pg_publication_namespace_pnnspid_pnpubid_index UNIQUE (pnnspid, pnpubid);


--
-- TOC entry 4311 (class 2606 OID 10216)
-- Name: pg_publication pg_publication_oid_index; Type: CONSTRAINT; Schema: pg_catalog; Owner: supabase_admin
--

ALTER TABLE ONLY pg_catalog.pg_publication
    ADD CONSTRAINT pg_publication_oid_index PRIMARY KEY (oid);


--
-- TOC entry 4313 (class 2606 OID 10217)
-- Name: pg_publication pg_publication_pubname_index; Type: CONSTRAINT; Schema: pg_catalog; Owner: supabase_admin
--

ALTER TABLE ONLY pg_catalog.pg_publication
    ADD CONSTRAINT pg_publication_pubname_index UNIQUE (pubname);


--
-- TOC entry 4315 (class 2606 OID 10220)
-- Name: pg_publication_rel pg_publication_rel_oid_index; Type: CONSTRAINT; Schema: pg_catalog; Owner: supabase_admin
--

ALTER TABLE ONLY pg_catalog.pg_publication_rel
    ADD CONSTRAINT pg_publication_rel_oid_index PRIMARY KEY (oid);


--
-- TOC entry 4318 (class 2606 OID 10221)
-- Name: pg_publication_rel pg_publication_rel_prrelid_prpubid_index; Type: CONSTRAINT; Schema: pg_catalog; Owner: supabase_admin
--

ALTER TABLE ONLY pg_catalog.pg_publication_rel
    ADD CONSTRAINT pg_publication_rel_prrelid_prpubid_index UNIQUE (prrelid, prpubid);


--
-- TOC entry 4271 (class 2606 OID 10212)
-- Name: pg_range pg_range_rngmultitypid_index; Type: CONSTRAINT; Schema: pg_catalog; Owner: supabase_admin
--

ALTER TABLE ONLY pg_catalog.pg_range
    ADD CONSTRAINT pg_range_rngmultitypid_index UNIQUE (rngmultitypid);


--
-- TOC entry 4273 (class 2606 OID 10211)
-- Name: pg_range pg_range_rngtypid_index; Type: CONSTRAINT; Schema: pg_catalog; Owner: supabase_admin
--

ALTER TABLE ONLY pg_catalog.pg_range
    ADD CONSTRAINT pg_range_rngtypid_index PRIMARY KEY (rngtypid);


SET default_tablespace = pg_global;

--
-- TOC entry 4301 (class 2606 OID 10199)
-- Name: pg_replication_origin pg_replication_origin_roiident_index; Type: CONSTRAINT; Schema: pg_catalog; Owner: supabase_admin; Tablespace: pg_global
--

ALTER TABLE ONLY pg_catalog.pg_replication_origin
    ADD CONSTRAINT pg_replication_origin_roiident_index PRIMARY KEY (roident);


--
-- TOC entry 4303 (class 2606 OID 10200)
-- Name: pg_replication_origin pg_replication_origin_roname_index; Type: CONSTRAINT; Schema: pg_catalog; Owner: supabase_admin; Tablespace: pg_global
--

ALTER TABLE ONLY pg_catalog.pg_replication_origin
    ADD CONSTRAINT pg_replication_origin_roname_index UNIQUE (roname);


SET default_tablespace = '';

--
-- TOC entry 4217 (class 2606 OID 10151)
-- Name: pg_rewrite pg_rewrite_oid_index; Type: CONSTRAINT; Schema: pg_catalog; Owner: supabase_admin
--

ALTER TABLE ONLY pg_catalog.pg_rewrite
    ADD CONSTRAINT pg_rewrite_oid_index PRIMARY KEY (oid);


--
-- TOC entry 4219 (class 2606 OID 10152)
-- Name: pg_rewrite pg_rewrite_rel_rulename_index; Type: CONSTRAINT; Schema: pg_catalog; Owner: supabase_admin
--

ALTER TABLE ONLY pg_catalog.pg_rewrite
    ADD CONSTRAINT pg_rewrite_rel_rulename_index UNIQUE (ev_class, rulename);


--
-- TOC entry 4281 (class 2606 OID 10204)
-- Name: pg_seclabel pg_seclabel_object_index; Type: CONSTRAINT; Schema: pg_catalog; Owner: supabase_admin
--

ALTER TABLE ONLY pg_catalog.pg_seclabel
    ADD CONSTRAINT pg_seclabel_object_index PRIMARY KEY (objoid, classoid, objsubid, provider);


--
-- TOC entry 4144 (class 2606 OID 10215)
-- Name: pg_sequence pg_sequence_seqrelid_index; Type: CONSTRAINT; Schema: pg_catalog; Owner: supabase_admin
--

ALTER TABLE ONLY pg_catalog.pg_sequence
    ADD CONSTRAINT pg_sequence_seqrelid_index PRIMARY KEY (seqrelid);


SET default_tablespace = pg_global;

--
-- TOC entry 4150 (class 2606 OID 10178)
-- Name: pg_shdescription pg_shdescription_o_c_index; Type: CONSTRAINT; Schema: pg_catalog; Owner: supabase_admin; Tablespace: pg_global
--

ALTER TABLE ONLY pg_catalog.pg_shdescription
    ADD CONSTRAINT pg_shdescription_o_c_index PRIMARY KEY (objoid, classoid);


--
-- TOC entry 4279 (class 2606 OID 10205)
-- Name: pg_shseclabel pg_shseclabel_object_index; Type: CONSTRAINT; Schema: pg_catalog; Owner: supabase_admin; Tablespace: pg_global
--

ALTER TABLE ONLY pg_catalog.pg_shseclabel
    ADD CONSTRAINT pg_shseclabel_object_index PRIMARY KEY (objoid, classoid, provider);


SET default_tablespace = '';

--
-- TOC entry 4255 (class 2606 OID 10150)
-- Name: pg_statistic_ext_data pg_statistic_ext_data_stxoid_inh_index; Type: CONSTRAINT; Schema: pg_catalog; Owner: supabase_admin
--

ALTER TABLE ONLY pg_catalog.pg_statistic_ext_data
    ADD CONSTRAINT pg_statistic_ext_data_stxoid_inh_index PRIMARY KEY (stxoid, stxdinherit);


--
-- TOC entry 4248 (class 2606 OID 10149)
-- Name: pg_statistic_ext pg_statistic_ext_name_index; Type: CONSTRAINT; Schema: pg_catalog; Owner: supabase_admin
--

ALTER TABLE ONLY pg_catalog.pg_statistic_ext
    ADD CONSTRAINT pg_statistic_ext_name_index UNIQUE (stxname, stxnamespace);


--
-- TOC entry 4250 (class 2606 OID 10148)
-- Name: pg_statistic_ext pg_statistic_ext_oid_index; Type: CONSTRAINT; Schema: pg_catalog; Owner: supabase_admin
--

ALTER TABLE ONLY pg_catalog.pg_statistic_ext
    ADD CONSTRAINT pg_statistic_ext_oid_index PRIMARY KEY (oid);


--
-- TOC entry 4221 (class 2606 OID 10147)
-- Name: pg_statistic pg_statistic_relid_att_inh_index; Type: CONSTRAINT; Schema: pg_catalog; Owner: supabase_admin
--

ALTER TABLE ONLY pg_catalog.pg_statistic
    ADD CONSTRAINT pg_statistic_relid_att_inh_index PRIMARY KEY (starelid, staattnum, stainherit);


SET default_tablespace = pg_global;

--
-- TOC entry 4305 (class 2606 OID 10222)
-- Name: pg_subscription pg_subscription_oid_index; Type: CONSTRAINT; Schema: pg_catalog; Owner: supabase_admin; Tablespace: pg_global
--

ALTER TABLE ONLY pg_catalog.pg_subscription
    ADD CONSTRAINT pg_subscription_oid_index PRIMARY KEY (oid);


SET default_tablespace = '';

--
-- TOC entry 4309 (class 2606 OID 10224)
-- Name: pg_subscription_rel pg_subscription_rel_srrelid_srsubid_index; Type: CONSTRAINT; Schema: pg_catalog; Owner: supabase_admin
--

ALTER TABLE ONLY pg_catalog.pg_subscription_rel
    ADD CONSTRAINT pg_subscription_rel_srrelid_srsubid_index PRIMARY KEY (srrelid, srsubid);


SET default_tablespace = pg_global;

--
-- TOC entry 4307 (class 2606 OID 10223)
-- Name: pg_subscription pg_subscription_subname_index; Type: CONSTRAINT; Schema: pg_catalog; Owner: supabase_admin; Tablespace: pg_global
--

ALTER TABLE ONLY pg_catalog.pg_subscription
    ADD CONSTRAINT pg_subscription_subname_index UNIQUE (subdbid, subname);


--
-- TOC entry 4098 (class 2606 OID 10171)
-- Name: pg_tablespace pg_tablespace_oid_index; Type: CONSTRAINT; Schema: pg_catalog; Owner: supabase_admin; Tablespace: pg_global
--

ALTER TABLE ONLY pg_catalog.pg_tablespace
    ADD CONSTRAINT pg_tablespace_oid_index PRIMARY KEY (oid);


--
-- TOC entry 4100 (class 2606 OID 10172)
-- Name: pg_tablespace pg_tablespace_spcname_index; Type: CONSTRAINT; Schema: pg_catalog; Owner: supabase_admin; Tablespace: pg_global
--

ALTER TABLE ONLY pg_catalog.pg_tablespace
    ADD CONSTRAINT pg_tablespace_spcname_index UNIQUE (spcname);


SET default_tablespace = '';

--
-- TOC entry 4275 (class 2606 OID 10213)
-- Name: pg_transform pg_transform_oid_index; Type: CONSTRAINT; Schema: pg_catalog; Owner: supabase_admin
--

ALTER TABLE ONLY pg_catalog.pg_transform
    ADD CONSTRAINT pg_transform_oid_index PRIMARY KEY (oid);


--
-- TOC entry 4277 (class 2606 OID 10214)
-- Name: pg_transform pg_transform_type_lang_index; Type: CONSTRAINT; Schema: pg_catalog; Owner: supabase_admin
--

ALTER TABLE ONLY pg_catalog.pg_transform
    ADD CONSTRAINT pg_transform_type_lang_index UNIQUE (trftype, trflang);


--
-- TOC entry 4223 (class 2606 OID 10154)
-- Name: pg_trigger pg_trigger_oid_index; Type: CONSTRAINT; Schema: pg_catalog; Owner: supabase_admin
--

ALTER TABLE ONLY pg_catalog.pg_trigger
    ADD CONSTRAINT pg_trigger_oid_index PRIMARY KEY (oid);


--
-- TOC entry 4226 (class 2606 OID 10153)
-- Name: pg_trigger pg_trigger_tgrelid_tgname_index; Type: CONSTRAINT; Schema: pg_catalog; Owner: supabase_admin
--

ALTER TABLE ONLY pg_catalog.pg_trigger
    ADD CONSTRAINT pg_trigger_tgrelid_tgname_index UNIQUE (tgrelid, tgname);


--
-- TOC entry 4291 (class 2606 OID 10179)
-- Name: pg_ts_config pg_ts_config_cfgname_index; Type: CONSTRAINT; Schema: pg_catalog; Owner: supabase_admin
--

ALTER TABLE ONLY pg_catalog.pg_ts_config
    ADD CONSTRAINT pg_ts_config_cfgname_index UNIQUE (cfgname, cfgnamespace);


--
-- TOC entry 4295 (class 2606 OID 10181)
-- Name: pg_ts_config_map pg_ts_config_map_index; Type: CONSTRAINT; Schema: pg_catalog; Owner: supabase_admin
--

ALTER TABLE ONLY pg_catalog.pg_ts_config_map
    ADD CONSTRAINT pg_ts_config_map_index PRIMARY KEY (mapcfg, maptokentype, mapseqno);


--
-- TOC entry 4293 (class 2606 OID 10180)
-- Name: pg_ts_config pg_ts_config_oid_index; Type: CONSTRAINT; Schema: pg_catalog; Owner: supabase_admin
--

ALTER TABLE ONLY pg_catalog.pg_ts_config
    ADD CONSTRAINT pg_ts_config_oid_index PRIMARY KEY (oid);


--
-- TOC entry 4283 (class 2606 OID 10182)
-- Name: pg_ts_dict pg_ts_dict_dictname_index; Type: CONSTRAINT; Schema: pg_catalog; Owner: supabase_admin
--

ALTER TABLE ONLY pg_catalog.pg_ts_dict
    ADD CONSTRAINT pg_ts_dict_dictname_index UNIQUE (dictname, dictnamespace);


--
-- TOC entry 4285 (class 2606 OID 10183)
-- Name: pg_ts_dict pg_ts_dict_oid_index; Type: CONSTRAINT; Schema: pg_catalog; Owner: supabase_admin
--

ALTER TABLE ONLY pg_catalog.pg_ts_dict
    ADD CONSTRAINT pg_ts_dict_oid_index PRIMARY KEY (oid);


--
-- TOC entry 4287 (class 2606 OID 10185)
-- Name: pg_ts_parser pg_ts_parser_oid_index; Type: CONSTRAINT; Schema: pg_catalog; Owner: supabase_admin
--

ALTER TABLE ONLY pg_catalog.pg_ts_parser
    ADD CONSTRAINT pg_ts_parser_oid_index PRIMARY KEY (oid);


--
-- TOC entry 4289 (class 2606 OID 10184)
-- Name: pg_ts_parser pg_ts_parser_prsname_index; Type: CONSTRAINT; Schema: pg_catalog; Owner: supabase_admin
--

ALTER TABLE ONLY pg_catalog.pg_ts_parser
    ADD CONSTRAINT pg_ts_parser_prsname_index UNIQUE (prsname, prsnamespace);


--
-- TOC entry 4297 (class 2606 OID 10187)
-- Name: pg_ts_template pg_ts_template_oid_index; Type: CONSTRAINT; Schema: pg_catalog; Owner: supabase_admin
--

ALTER TABLE ONLY pg_catalog.pg_ts_template
    ADD CONSTRAINT pg_ts_template_oid_index PRIMARY KEY (oid);


--
-- TOC entry 4299 (class 2606 OID 10186)
-- Name: pg_ts_template pg_ts_template_tmplname_index; Type: CONSTRAINT; Schema: pg_catalog; Owner: supabase_admin
--

ALTER TABLE ONLY pg_catalog.pg_ts_template
    ADD CONSTRAINT pg_ts_template_tmplname_index UNIQUE (tmplname, tmplnamespace);


--
-- TOC entry 4104 (class 2606 OID 10117)
-- Name: pg_type pg_type_oid_index; Type: CONSTRAINT; Schema: pg_catalog; Owner: supabase_admin
--

ALTER TABLE ONLY pg_catalog.pg_type
    ADD CONSTRAINT pg_type_oid_index PRIMARY KEY (oid);


--
-- TOC entry 4106 (class 2606 OID 10118)
-- Name: pg_type pg_type_typname_nsp_index; Type: CONSTRAINT; Schema: pg_catalog; Owner: supabase_admin
--

ALTER TABLE ONLY pg_catalog.pg_type
    ADD CONSTRAINT pg_type_typname_nsp_index UNIQUE (typname, typnamespace);


--
-- TOC entry 4140 (class 2606 OID 10194)
-- Name: pg_user_mapping pg_user_mapping_oid_index; Type: CONSTRAINT; Schema: pg_catalog; Owner: supabase_admin
--

ALTER TABLE ONLY pg_catalog.pg_user_mapping
    ADD CONSTRAINT pg_user_mapping_oid_index PRIMARY KEY (oid);


--
-- TOC entry 4142 (class 2606 OID 10195)
-- Name: pg_user_mapping pg_user_mapping_user_server_index; Type: CONSTRAINT; Schema: pg_catalog; Owner: supabase_admin
--

ALTER TABLE ONLY pg_catalog.pg_user_mapping
    ADD CONSTRAINT pg_user_mapping_user_server_index UNIQUE (umuser, umserver);


--
-- TOC entry 4568 (class 2606 OID 18241)
-- Name: audit_log audit_log_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.audit_log
    ADD CONSTRAINT audit_log_pkey PRIMARY KEY (id);


--
-- TOC entry 4586 (class 2606 OID 18495)
-- Name: champion_masteries champion_masteries_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.champion_masteries
    ADD CONSTRAINT champion_masteries_pkey PRIMARY KEY (id);


--
-- TOC entry 4588 (class 2606 OID 18497)
-- Name: champion_masteries champion_masteries_unique_account_champion; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.champion_masteries
    ADD CONSTRAINT champion_masteries_unique_account_champion UNIQUE (riot_account_id, champion_id);


--
-- TOC entry 4564 (class 2606 OID 18199)
-- Name: disputes disputes_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.disputes
    ADD CONSTRAINT disputes_pkey PRIMARY KEY (id);


--
-- TOC entry 4517 (class 2606 OID 17778)
-- Name: inscricoes inscricoes_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.inscricoes
    ADD CONSTRAINT inscricoes_pkey PRIMARY KEY (id);


--
-- TOC entry 4519 (class 2606 OID 17780)
-- Name: inscricoes inscricoes_tournament_id_team_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.inscricoes
    ADD CONSTRAINT inscricoes_tournament_id_team_id_key UNIQUE (tournament_id, team_id);


--
-- TOC entry 4532 (class 2606 OID 17907)
-- Name: match_games match_games_match_id_game_number_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.match_games
    ADD CONSTRAINT match_games_match_id_game_number_key UNIQUE (match_id, game_number);


--
-- TOC entry 4534 (class 2606 OID 17905)
-- Name: match_games match_games_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.match_games
    ADD CONSTRAINT match_games_pkey PRIMARY KEY (id);


--
-- TOC entry 4526 (class 2606 OID 17816)
-- Name: matches matches_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.matches
    ADD CONSTRAINT matches_pkey PRIMARY KEY (id);


--
-- TOC entry 4549 (class 2606 OID 17986)
-- Name: notifications notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_pkey PRIMARY KEY (id);


--
-- TOC entry 4541 (class 2606 OID 17940)
-- Name: player_stats player_stats_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.player_stats
    ADD CONSTRAINT player_stats_pkey PRIMARY KEY (id);


--
-- TOC entry 4508 (class 2606 OID 17758)
-- Name: players players_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.players
    ADD CONSTRAINT players_pkey PRIMARY KEY (id);


--
-- TOC entry 4510 (class 2606 OID 17760)
-- Name: players players_puuid_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.players
    ADD CONSTRAINT players_puuid_key UNIQUE (puuid);


--
-- TOC entry 4552 (class 2606 OID 18115)
-- Name: prize_distribution prize_distribution_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.prize_distribution
    ADD CONSTRAINT prize_distribution_pkey PRIMARY KEY (id);


--
-- TOC entry 4490 (class 2606 OID 17691)
-- Name: profiles profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_pkey PRIMARY KEY (id);


--
-- TOC entry 4584 (class 2606 OID 18476)
-- Name: rank_snapshots rank_snapshots_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.rank_snapshots
    ADD CONSTRAINT rank_snapshots_pkey PRIMARY KEY (id);


--
-- TOC entry 4580 (class 2606 OID 18452)
-- Name: riot_accounts riot_accounts_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.riot_accounts
    ADD CONSTRAINT riot_accounts_pkey PRIMARY KEY (id);


--
-- TOC entry 4556 (class 2606 OID 18132)
-- Name: seedings seedings_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.seedings
    ADD CONSTRAINT seedings_pkey PRIMARY KEY (id);


--
-- TOC entry 4558 (class 2606 OID 18136)
-- Name: seedings seedings_tournament_id_seed_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.seedings
    ADD CONSTRAINT seedings_tournament_id_seed_key UNIQUE (tournament_id, seed);


--
-- TOC entry 4560 (class 2606 OID 18134)
-- Name: seedings seedings_tournament_id_team_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.seedings
    ADD CONSTRAINT seedings_tournament_id_team_id_key UNIQUE (tournament_id, team_id);


--
-- TOC entry 4562 (class 2606 OID 18168)
-- Name: team_invites team_invites_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.team_invites
    ADD CONSTRAINT team_invites_pkey PRIMARY KEY (id);


--
-- TOC entry 4498 (class 2606 OID 17727)
-- Name: teams teams_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.teams
    ADD CONSTRAINT teams_pkey PRIMARY KEY (id);


--
-- TOC entry 4500 (class 2606 OID 17729)
-- Name: teams teams_tournament_id_tag_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.teams
    ADD CONSTRAINT teams_tournament_id_tag_key UNIQUE (tournament_id, tag);


--
-- TOC entry 4566 (class 2606 OID 18224)
-- Name: tournament_rules tournament_rules_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tournament_rules
    ADD CONSTRAINT tournament_rules_pkey PRIMARY KEY (id);


--
-- TOC entry 4529 (class 2606 OID 17879)
-- Name: tournament_stages tournament_stages_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tournament_stages
    ADD CONSTRAINT tournament_stages_pkey PRIMARY KEY (id);


--
-- TOC entry 4493 (class 2606 OID 17712)
-- Name: tournaments tournaments_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tournaments
    ADD CONSTRAINT tournaments_pkey PRIMARY KEY (id);


--
-- TOC entry 4496 (class 2606 OID 18605)
-- Name: tournaments tournaments_slug_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tournaments
    ADD CONSTRAINT tournaments_slug_key UNIQUE (slug);


--
-- TOC entry 4488 (class 2606 OID 17543)
-- Name: messages messages_pkey; Type: CONSTRAINT; Schema: realtime; Owner: supabase_realtime_admin
--

ALTER TABLE ONLY realtime.messages
    ADD CONSTRAINT messages_pkey PRIMARY KEY (id, inserted_at);


--
-- TOC entry 4592 (class 2606 OID 18550)
-- Name: messages_2026_04_22 messages_2026_04_22_pkey; Type: CONSTRAINT; Schema: realtime; Owner: supabase_admin
--

ALTER TABLE ONLY realtime.messages_2026_04_22
    ADD CONSTRAINT messages_2026_04_22_pkey PRIMARY KEY (id, inserted_at);


--
-- TOC entry 4595 (class 2606 OID 18562)
-- Name: messages_2026_04_23 messages_2026_04_23_pkey; Type: CONSTRAINT; Schema: realtime; Owner: supabase_admin
--

ALTER TABLE ONLY realtime.messages_2026_04_23
    ADD CONSTRAINT messages_2026_04_23_pkey PRIMARY KEY (id, inserted_at);


--
-- TOC entry 4598 (class 2606 OID 18574)
-- Name: messages_2026_04_24 messages_2026_04_24_pkey; Type: CONSTRAINT; Schema: realtime; Owner: supabase_admin
--

ALTER TABLE ONLY realtime.messages_2026_04_24
    ADD CONSTRAINT messages_2026_04_24_pkey PRIMARY KEY (id, inserted_at);


--
-- TOC entry 4601 (class 2606 OID 18586)
-- Name: messages_2026_04_25 messages_2026_04_25_pkey; Type: CONSTRAINT; Schema: realtime; Owner: supabase_admin
--

ALTER TABLE ONLY realtime.messages_2026_04_25
    ADD CONSTRAINT messages_2026_04_25_pkey PRIMARY KEY (id, inserted_at);


--
-- TOC entry 4604 (class 2606 OID 18598)
-- Name: messages_2026_04_26 messages_2026_04_26_pkey; Type: CONSTRAINT; Schema: realtime; Owner: supabase_admin
--

ALTER TABLE ONLY realtime.messages_2026_04_26
    ADD CONSTRAINT messages_2026_04_26_pkey PRIMARY KEY (id, inserted_at);


--
-- TOC entry 4607 (class 2606 OID 18621)
-- Name: messages_2026_04_27 messages_2026_04_27_pkey; Type: CONSTRAINT; Schema: realtime; Owner: supabase_admin
--

ALTER TABLE ONLY realtime.messages_2026_04_27
    ADD CONSTRAINT messages_2026_04_27_pkey PRIMARY KEY (id, inserted_at);


--
-- TOC entry 4610 (class 2606 OID 18716)
-- Name: messages_2026_04_28 messages_2026_04_28_pkey; Type: CONSTRAINT; Schema: realtime; Owner: supabase_admin
--

ALTER TABLE ONLY realtime.messages_2026_04_28
    ADD CONSTRAINT messages_2026_04_28_pkey PRIMARY KEY (id, inserted_at);


--
-- TOC entry 4484 (class 2606 OID 17397)
-- Name: subscription pk_subscription; Type: CONSTRAINT; Schema: realtime; Owner: supabase_admin
--

ALTER TABLE ONLY realtime.subscription
    ADD CONSTRAINT pk_subscription PRIMARY KEY (id);


--
-- TOC entry 4481 (class 2606 OID 17370)
-- Name: schema_migrations schema_migrations_pkey; Type: CONSTRAINT; Schema: realtime; Owner: supabase_admin
--

ALTER TABLE ONLY realtime.schema_migrations
    ADD CONSTRAINT schema_migrations_pkey PRIMARY KEY (version);


--
-- TOC entry 4473 (class 2606 OID 17342)
-- Name: buckets_analytics buckets_analytics_pkey; Type: CONSTRAINT; Schema: storage; Owner: supabase_storage_admin
--

ALTER TABLE ONLY storage.buckets_analytics
    ADD CONSTRAINT buckets_analytics_pkey PRIMARY KEY (id);


--
-- TOC entry 4460 (class 2606 OID 17184)
-- Name: buckets buckets_pkey; Type: CONSTRAINT; Schema: storage; Owner: supabase_storage_admin
--

ALTER TABLE ONLY storage.buckets
    ADD CONSTRAINT buckets_pkey PRIMARY KEY (id);


--
-- TOC entry 4476 (class 2606 OID 17318)
-- Name: buckets_vectors buckets_vectors_pkey; Type: CONSTRAINT; Schema: storage; Owner: supabase_storage_admin
--

ALTER TABLE ONLY storage.buckets_vectors
    ADD CONSTRAINT buckets_vectors_pkey PRIMARY KEY (id);


--
-- TOC entry 4455 (class 2606 OID 17175)
-- Name: migrations migrations_name_key; Type: CONSTRAINT; Schema: storage; Owner: supabase_storage_admin
--

ALTER TABLE ONLY storage.migrations
    ADD CONSTRAINT migrations_name_key UNIQUE (name);


--
-- TOC entry 4457 (class 2606 OID 17173)
-- Name: migrations migrations_pkey; Type: CONSTRAINT; Schema: storage; Owner: supabase_storage_admin
--

ALTER TABLE ONLY storage.migrations
    ADD CONSTRAINT migrations_pkey PRIMARY KEY (id);


--
-- TOC entry 4466 (class 2606 OID 17196)
-- Name: objects objects_pkey; Type: CONSTRAINT; Schema: storage; Owner: supabase_storage_admin
--

ALTER TABLE ONLY storage.objects
    ADD CONSTRAINT objects_pkey PRIMARY KEY (id);


--
-- TOC entry 4471 (class 2606 OID 17258)
-- Name: s3_multipart_uploads_parts s3_multipart_uploads_parts_pkey; Type: CONSTRAINT; Schema: storage; Owner: supabase_storage_admin
--

ALTER TABLE ONLY storage.s3_multipart_uploads_parts
    ADD CONSTRAINT s3_multipart_uploads_parts_pkey PRIMARY KEY (id);


--
-- TOC entry 4469 (class 2606 OID 17243)
-- Name: s3_multipart_uploads s3_multipart_uploads_pkey; Type: CONSTRAINT; Schema: storage; Owner: supabase_storage_admin
--

ALTER TABLE ONLY storage.s3_multipart_uploads
    ADD CONSTRAINT s3_multipart_uploads_pkey PRIMARY KEY (id);


--
-- TOC entry 4479 (class 2606 OID 17328)
-- Name: vector_indexes vector_indexes_pkey; Type: CONSTRAINT; Schema: storage; Owner: supabase_storage_admin
--

ALTER TABLE ONLY storage.vector_indexes
    ADD CONSTRAINT vector_indexes_pkey PRIMARY KEY (id);


--
-- TOC entry 4573 (class 2606 OID 18265)
-- Name: schema_migrations schema_migrations_idempotency_key_key; Type: CONSTRAINT; Schema: supabase_migrations; Owner: postgres
--

ALTER TABLE ONLY supabase_migrations.schema_migrations
    ADD CONSTRAINT schema_migrations_idempotency_key_key UNIQUE (idempotency_key);


--
-- TOC entry 4575 (class 2606 OID 18263)
-- Name: schema_migrations schema_migrations_pkey; Type: CONSTRAINT; Schema: supabase_migrations; Owner: postgres
--

ALTER TABLE ONLY supabase_migrations.schema_migrations
    ADD CONSTRAINT schema_migrations_pkey PRIMARY KEY (version);


--
-- TOC entry 4357 (class 1259 OID 16536)
-- Name: audit_logs_instance_id_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX audit_logs_instance_id_idx ON auth.audit_log_entries USING btree (instance_id);


--
-- TOC entry 4327 (class 1259 OID 16707)
-- Name: confirmation_token_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE UNIQUE INDEX confirmation_token_idx ON auth.users USING btree (confirmation_token) WHERE ((confirmation_token)::text !~ '^[0-9 ]*$'::text);


--
-- TOC entry 4438 (class 1259 OID 17123)
-- Name: custom_oauth_providers_created_at_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX custom_oauth_providers_created_at_idx ON auth.custom_oauth_providers USING btree (created_at);


--
-- TOC entry 4439 (class 1259 OID 17122)
-- Name: custom_oauth_providers_enabled_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX custom_oauth_providers_enabled_idx ON auth.custom_oauth_providers USING btree (enabled);


--
-- TOC entry 4440 (class 1259 OID 17120)
-- Name: custom_oauth_providers_identifier_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX custom_oauth_providers_identifier_idx ON auth.custom_oauth_providers USING btree (identifier);


--
-- TOC entry 4445 (class 1259 OID 17121)
-- Name: custom_oauth_providers_provider_type_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX custom_oauth_providers_provider_type_idx ON auth.custom_oauth_providers USING btree (provider_type);


--
-- TOC entry 4328 (class 1259 OID 16709)
-- Name: email_change_token_current_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE UNIQUE INDEX email_change_token_current_idx ON auth.users USING btree (email_change_token_current) WHERE ((email_change_token_current)::text !~ '^[0-9 ]*$'::text);


--
-- TOC entry 4329 (class 1259 OID 16710)
-- Name: email_change_token_new_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE UNIQUE INDEX email_change_token_new_idx ON auth.users USING btree (email_change_token_new) WHERE ((email_change_token_new)::text !~ '^[0-9 ]*$'::text);


--
-- TOC entry 4375 (class 1259 OID 16789)
-- Name: factor_id_created_at_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX factor_id_created_at_idx ON auth.mfa_factors USING btree (user_id, created_at);


--
-- TOC entry 4408 (class 1259 OID 16897)
-- Name: flow_state_created_at_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX flow_state_created_at_idx ON auth.flow_state USING btree (created_at DESC);


--
-- TOC entry 4363 (class 1259 OID 16877)
-- Name: identities_email_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX identities_email_idx ON auth.identities USING btree (email text_pattern_ops);


--
-- TOC entry 5068 (class 0 OID 0)
-- Dependencies: 4363
-- Name: INDEX identities_email_idx; Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON INDEX auth.identities_email_idx IS 'Auth: Ensures indexed queries on the email column';


--
-- TOC entry 4368 (class 1259 OID 16704)
-- Name: identities_user_id_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX identities_user_id_idx ON auth.identities USING btree (user_id);


--
-- TOC entry 4411 (class 1259 OID 16894)
-- Name: idx_auth_code; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX idx_auth_code ON auth.flow_state USING btree (auth_code);


--
-- TOC entry 4435 (class 1259 OID 17079)
-- Name: idx_oauth_client_states_created_at; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX idx_oauth_client_states_created_at ON auth.oauth_client_states USING btree (created_at);


--
-- TOC entry 4412 (class 1259 OID 16895)
-- Name: idx_user_id_auth_method; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX idx_user_id_auth_method ON auth.flow_state USING btree (user_id, authentication_method);


--
-- TOC entry 4330 (class 1259 OID 17165)
-- Name: idx_users_created_at_desc; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX idx_users_created_at_desc ON auth.users USING btree (created_at DESC);


--
-- TOC entry 4331 (class 1259 OID 17164)
-- Name: idx_users_email; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX idx_users_email ON auth.users USING btree (email);


--
-- TOC entry 4332 (class 1259 OID 17166)
-- Name: idx_users_last_sign_in_at_desc; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX idx_users_last_sign_in_at_desc ON auth.users USING btree (last_sign_in_at DESC);


--
-- TOC entry 4333 (class 1259 OID 17167)
-- Name: idx_users_name; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX idx_users_name ON auth.users USING btree (((raw_user_meta_data ->> 'name'::text))) WHERE ((raw_user_meta_data ->> 'name'::text) IS NOT NULL);


--
-- TOC entry 4383 (class 1259 OID 16900)
-- Name: mfa_challenge_created_at_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX mfa_challenge_created_at_idx ON auth.mfa_challenges USING btree (created_at DESC);


--
-- TOC entry 4380 (class 1259 OID 16761)
-- Name: mfa_factors_user_friendly_name_unique; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE UNIQUE INDEX mfa_factors_user_friendly_name_unique ON auth.mfa_factors USING btree (friendly_name, user_id) WHERE (TRIM(BOTH FROM friendly_name) <> ''::text);


--
-- TOC entry 4381 (class 1259 OID 16906)
-- Name: mfa_factors_user_id_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX mfa_factors_user_id_idx ON auth.mfa_factors USING btree (user_id);


--
-- TOC entry 4421 (class 1259 OID 17031)
-- Name: oauth_auth_pending_exp_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX oauth_auth_pending_exp_idx ON auth.oauth_authorizations USING btree (expires_at) WHERE (status = 'pending'::auth.oauth_authorization_status);


--
-- TOC entry 4418 (class 1259 OID 16984)
-- Name: oauth_clients_deleted_at_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX oauth_clients_deleted_at_idx ON auth.oauth_clients USING btree (deleted_at);


--
-- TOC entry 4428 (class 1259 OID 17057)
-- Name: oauth_consents_active_client_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX oauth_consents_active_client_idx ON auth.oauth_consents USING btree (client_id) WHERE (revoked_at IS NULL);


--
-- TOC entry 4429 (class 1259 OID 17055)
-- Name: oauth_consents_active_user_client_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX oauth_consents_active_user_client_idx ON auth.oauth_consents USING btree (user_id, client_id) WHERE (revoked_at IS NULL);


--
-- TOC entry 4434 (class 1259 OID 17056)
-- Name: oauth_consents_user_order_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX oauth_consents_user_order_idx ON auth.oauth_consents USING btree (user_id, granted_at DESC);


--
-- TOC entry 4415 (class 1259 OID 16953)
-- Name: one_time_tokens_relates_to_hash_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX one_time_tokens_relates_to_hash_idx ON auth.one_time_tokens USING hash (relates_to);


--
-- TOC entry 4416 (class 1259 OID 16952)
-- Name: one_time_tokens_token_hash_hash_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX one_time_tokens_token_hash_hash_idx ON auth.one_time_tokens USING hash (token_hash);


--
-- TOC entry 4417 (class 1259 OID 16954)
-- Name: one_time_tokens_user_id_token_type_key; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE UNIQUE INDEX one_time_tokens_user_id_token_type_key ON auth.one_time_tokens USING btree (user_id, token_type);


--
-- TOC entry 4334 (class 1259 OID 16711)
-- Name: reauthentication_token_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE UNIQUE INDEX reauthentication_token_idx ON auth.users USING btree (reauthentication_token) WHERE ((reauthentication_token)::text !~ '^[0-9 ]*$'::text);


--
-- TOC entry 4335 (class 1259 OID 16708)
-- Name: recovery_token_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE UNIQUE INDEX recovery_token_idx ON auth.users USING btree (recovery_token) WHERE ((recovery_token)::text !~ '^[0-9 ]*$'::text);


--
-- TOC entry 4344 (class 1259 OID 16519)
-- Name: refresh_tokens_instance_id_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX refresh_tokens_instance_id_idx ON auth.refresh_tokens USING btree (instance_id);


--
-- TOC entry 4345 (class 1259 OID 16520)
-- Name: refresh_tokens_instance_id_user_id_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX refresh_tokens_instance_id_user_id_idx ON auth.refresh_tokens USING btree (instance_id, user_id);


--
-- TOC entry 4346 (class 1259 OID 16703)
-- Name: refresh_tokens_parent_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX refresh_tokens_parent_idx ON auth.refresh_tokens USING btree (parent);


--
-- TOC entry 4349 (class 1259 OID 16791)
-- Name: refresh_tokens_session_id_revoked_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX refresh_tokens_session_id_revoked_idx ON auth.refresh_tokens USING btree (session_id, revoked);


--
-- TOC entry 4352 (class 1259 OID 16896)
-- Name: refresh_tokens_updated_at_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX refresh_tokens_updated_at_idx ON auth.refresh_tokens USING btree (updated_at DESC);


--
-- TOC entry 4402 (class 1259 OID 16833)
-- Name: saml_providers_sso_provider_id_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX saml_providers_sso_provider_id_idx ON auth.saml_providers USING btree (sso_provider_id);


--
-- TOC entry 4403 (class 1259 OID 16898)
-- Name: saml_relay_states_created_at_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX saml_relay_states_created_at_idx ON auth.saml_relay_states USING btree (created_at DESC);


--
-- TOC entry 4404 (class 1259 OID 16848)
-- Name: saml_relay_states_for_email_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX saml_relay_states_for_email_idx ON auth.saml_relay_states USING btree (for_email);


--
-- TOC entry 4407 (class 1259 OID 16847)
-- Name: saml_relay_states_sso_provider_id_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX saml_relay_states_sso_provider_id_idx ON auth.saml_relay_states USING btree (sso_provider_id);


--
-- TOC entry 4369 (class 1259 OID 16899)
-- Name: sessions_not_after_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX sessions_not_after_idx ON auth.sessions USING btree (not_after DESC);


--
-- TOC entry 4370 (class 1259 OID 17069)
-- Name: sessions_oauth_client_id_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX sessions_oauth_client_id_idx ON auth.sessions USING btree (oauth_client_id);


--
-- TOC entry 4373 (class 1259 OID 16790)
-- Name: sessions_user_id_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX sessions_user_id_idx ON auth.sessions USING btree (user_id);


--
-- TOC entry 4394 (class 1259 OID 16815)
-- Name: sso_domains_domain_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE UNIQUE INDEX sso_domains_domain_idx ON auth.sso_domains USING btree (lower(domain));


--
-- TOC entry 4397 (class 1259 OID 16814)
-- Name: sso_domains_sso_provider_id_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX sso_domains_sso_provider_id_idx ON auth.sso_domains USING btree (sso_provider_id);


--
-- TOC entry 4392 (class 1259 OID 16800)
-- Name: sso_providers_resource_id_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE UNIQUE INDEX sso_providers_resource_id_idx ON auth.sso_providers USING btree (lower(resource_id));


--
-- TOC entry 4393 (class 1259 OID 16962)
-- Name: sso_providers_resource_id_pattern_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX sso_providers_resource_id_pattern_idx ON auth.sso_providers USING btree (resource_id text_pattern_ops);


--
-- TOC entry 4382 (class 1259 OID 16959)
-- Name: unique_phone_factor_per_user; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE UNIQUE INDEX unique_phone_factor_per_user ON auth.mfa_factors USING btree (user_id, phone);


--
-- TOC entry 4374 (class 1259 OID 16788)
-- Name: user_id_created_at_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX user_id_created_at_idx ON auth.sessions USING btree (user_id, created_at);


--
-- TOC entry 4336 (class 1259 OID 16868)
-- Name: users_email_partial_key; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE UNIQUE INDEX users_email_partial_key ON auth.users USING btree (email) WHERE (is_sso_user = false);


--
-- TOC entry 5069 (class 0 OID 0)
-- Dependencies: 4336
-- Name: INDEX users_email_partial_key; Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON INDEX auth.users_email_partial_key IS 'Auth: A partial unique index that applies only when is_sso_user is false';


--
-- TOC entry 4337 (class 1259 OID 16705)
-- Name: users_instance_id_email_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX users_instance_id_email_idx ON auth.users USING btree (instance_id, lower((email)::text));


--
-- TOC entry 4338 (class 1259 OID 16509)
-- Name: users_instance_id_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX users_instance_id_idx ON auth.users USING btree (instance_id);


--
-- TOC entry 4339 (class 1259 OID 16923)
-- Name: users_is_anonymous_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX users_is_anonymous_idx ON auth.users USING btree (is_anonymous);


--
-- TOC entry 4450 (class 1259 OID 17163)
-- Name: webauthn_challenges_expires_at_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX webauthn_challenges_expires_at_idx ON auth.webauthn_challenges USING btree (expires_at);


--
-- TOC entry 4453 (class 1259 OID 17162)
-- Name: webauthn_challenges_user_id_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX webauthn_challenges_user_id_idx ON auth.webauthn_challenges USING btree (user_id);


--
-- TOC entry 4446 (class 1259 OID 17145)
-- Name: webauthn_credentials_credential_id_key; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE UNIQUE INDEX webauthn_credentials_credential_id_key ON auth.webauthn_credentials USING btree (credential_id);


--
-- TOC entry 4449 (class 1259 OID 17146)
-- Name: webauthn_credentials_user_id_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX webauthn_credentials_user_id_idx ON auth.webauthn_credentials USING btree (user_id);


SET default_tablespace = pg_global;

--
-- TOC entry 4124 (class 1259 OID 6302)
-- Name: pg_auth_members_grantor_index; Type: INDEX; Schema: pg_catalog; Owner: supabase_admin; Tablespace: pg_global
--

CREATE INDEX pg_auth_members_grantor_index ON pg_catalog.pg_auth_members USING btree (grantor);


SET default_tablespace = '';

--
-- TOC entry 4119 (class 1259 OID 3455)
-- Name: pg_class_tblspc_relfilenode_index; Type: INDEX; Schema: pg_catalog; Owner: supabase_admin
--

CREATE INDEX pg_class_tblspc_relfilenode_index ON pg_catalog.pg_class USING btree (reltablespace, relfilenode);


--
-- TOC entry 4175 (class 1259 OID 2664)
-- Name: pg_constraint_conname_nsp_index; Type: INDEX; Schema: pg_catalog; Owner: supabase_admin
--

CREATE INDEX pg_constraint_conname_nsp_index ON pg_catalog.pg_constraint USING btree (conname, connamespace);


--
-- TOC entry 4176 (class 1259 OID 2579)
-- Name: pg_constraint_conparentid_index; Type: INDEX; Schema: pg_catalog; Owner: supabase_admin
--

CREATE INDEX pg_constraint_conparentid_index ON pg_catalog.pg_constraint USING btree (conparentid);


--
-- TOC entry 4179 (class 1259 OID 2666)
-- Name: pg_constraint_contypid_index; Type: INDEX; Schema: pg_catalog; Owner: supabase_admin
--

CREATE INDEX pg_constraint_contypid_index ON pg_catalog.pg_constraint USING btree (contypid);


--
-- TOC entry 4188 (class 1259 OID 2673)
-- Name: pg_depend_depender_index; Type: INDEX; Schema: pg_catalog; Owner: supabase_admin
--

CREATE INDEX pg_depend_depender_index ON pg_catalog.pg_depend USING btree (classid, objid, objsubid);


--
-- TOC entry 4189 (class 1259 OID 2674)
-- Name: pg_depend_reference_index; Type: INDEX; Schema: pg_catalog; Owner: supabase_admin
--

CREATE INDEX pg_depend_reference_index ON pg_catalog.pg_depend USING btree (refclassid, refobjid, refobjsubid);


--
-- TOC entry 4194 (class 1259 OID 2678)
-- Name: pg_index_indrelid_index; Type: INDEX; Schema: pg_catalog; Owner: supabase_admin
--

CREATE INDEX pg_index_indrelid_index ON pg_catalog.pg_index USING btree (indrelid);


--
-- TOC entry 4195 (class 1259 OID 2187)
-- Name: pg_inherits_parent_index; Type: INDEX; Schema: pg_catalog; Owner: supabase_admin
--

CREATE INDEX pg_inherits_parent_index ON pg_catalog.pg_inherits USING btree (inhparent);


--
-- TOC entry 4316 (class 1259 OID 6116)
-- Name: pg_publication_rel_prpubid_index; Type: INDEX; Schema: pg_catalog; Owner: supabase_admin
--

CREATE INDEX pg_publication_rel_prpubid_index ON pg_catalog.pg_publication_rel USING btree (prpubid);


SET default_tablespace = pg_global;

--
-- TOC entry 4101 (class 1259 OID 1232)
-- Name: pg_shdepend_depender_index; Type: INDEX; Schema: pg_catalog; Owner: supabase_admin; Tablespace: pg_global
--

CREATE INDEX pg_shdepend_depender_index ON pg_catalog.pg_shdepend USING btree (dbid, classid, objid, objsubid);


--
-- TOC entry 4102 (class 1259 OID 1233)
-- Name: pg_shdepend_reference_index; Type: INDEX; Schema: pg_catalog; Owner: supabase_admin; Tablespace: pg_global
--

CREATE INDEX pg_shdepend_reference_index ON pg_catalog.pg_shdepend USING btree (refclassid, refobjid);


SET default_tablespace = '';

--
-- TOC entry 4251 (class 1259 OID 3379)
-- Name: pg_statistic_ext_relid_index; Type: INDEX; Schema: pg_catalog; Owner: supabase_admin
--

CREATE INDEX pg_statistic_ext_relid_index ON pg_catalog.pg_statistic_ext USING btree (stxrelid);


--
-- TOC entry 4224 (class 1259 OID 2699)
-- Name: pg_trigger_tgconstraint_index; Type: INDEX; Schema: pg_catalog; Owner: supabase_admin
--

CREATE INDEX pg_trigger_tgconstraint_index ON pg_catalog.pg_trigger USING btree (tgconstraint);


--
-- TOC entry 4569 (class 1259 OID 18250)
-- Name: idx_audit_log_admin_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_audit_log_admin_id ON public.audit_log USING btree (admin_id);


--
-- TOC entry 4570 (class 1259 OID 18249)
-- Name: idx_audit_log_created_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_audit_log_created_at ON public.audit_log USING btree (created_at DESC);


--
-- TOC entry 4571 (class 1259 OID 18251)
-- Name: idx_audit_log_table_name; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_audit_log_table_name ON public.audit_log USING btree (table_name);


--
-- TOC entry 4589 (class 1259 OID 18503)
-- Name: idx_champion_masteries_account; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_champion_masteries_account ON public.champion_masteries USING btree (riot_account_id);


--
-- TOC entry 4511 (class 1259 OID 18540)
-- Name: idx_inscricoes_requested_by; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_inscricoes_requested_by ON public.inscricoes USING btree (requested_by);


--
-- TOC entry 4512 (class 1259 OID 18541)
-- Name: idx_inscricoes_requested_by_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_inscricoes_requested_by_status ON public.inscricoes USING btree (requested_by, status);


--
-- TOC entry 4513 (class 1259 OID 18538)
-- Name: idx_inscricoes_team_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_inscricoes_team_id ON public.inscricoes USING btree (team_id);


--
-- TOC entry 4514 (class 1259 OID 18539)
-- Name: idx_inscricoes_tournament_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_inscricoes_tournament_id ON public.inscricoes USING btree (tournament_id);


--
-- TOC entry 4515 (class 1259 OID 18341)
-- Name: idx_inscricoes_tournament_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_inscricoes_tournament_status ON public.inscricoes USING btree (tournament_id, status);


--
-- TOC entry 4530 (class 1259 OID 17918)
-- Name: idx_match_games_match; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_match_games_match ON public.match_games USING btree (match_id);


--
-- TOC entry 4520 (class 1259 OID 17838)
-- Name: idx_matches_round; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_matches_round ON public.matches USING btree (tournament_id, round);


--
-- TOC entry 4521 (class 1259 OID 18339)
-- Name: idx_matches_stage_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_matches_stage_id ON public.matches USING btree (stage_id) WHERE (stage_id IS NOT NULL);


--
-- TOC entry 4522 (class 1259 OID 18340)
-- Name: idx_matches_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_matches_status ON public.matches USING btree (status);


--
-- TOC entry 4523 (class 1259 OID 17837)
-- Name: idx_matches_tournament; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_matches_tournament ON public.matches USING btree (tournament_id);


--
-- TOC entry 4524 (class 1259 OID 18338)
-- Name: idx_matches_tournament_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_matches_tournament_id ON public.matches USING btree (tournament_id);


--
-- TOC entry 4542 (class 1259 OID 17994)
-- Name: idx_notifications_expires; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_notifications_expires ON public.notifications USING btree (expires_at);


--
-- TOC entry 4543 (class 1259 OID 18525)
-- Name: idx_notifications_type; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_notifications_type ON public.notifications USING btree (type);


--
-- TOC entry 4544 (class 1259 OID 17993)
-- Name: idx_notifications_unread; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_notifications_unread ON public.notifications USING btree (user_id) WHERE (read = false);


--
-- TOC entry 4545 (class 1259 OID 17992)
-- Name: idx_notifications_user; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_notifications_user ON public.notifications USING btree (user_id);


--
-- TOC entry 4546 (class 1259 OID 18524)
-- Name: idx_notifications_user_created_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_notifications_user_created_at ON public.notifications USING btree (user_id, created_at DESC);


--
-- TOC entry 4547 (class 1259 OID 18342)
-- Name: idx_notifications_user_unread; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_notifications_user_unread ON public.notifications USING btree (user_id, read) WHERE (read = false);


--
-- TOC entry 4535 (class 1259 OID 17956)
-- Name: idx_player_stats_game; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_player_stats_game ON public.player_stats USING btree (game_id);


--
-- TOC entry 4536 (class 1259 OID 18337)
-- Name: idx_player_stats_game_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_player_stats_game_id ON public.player_stats USING btree (game_id);


--
-- TOC entry 4537 (class 1259 OID 17957)
-- Name: idx_player_stats_player; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_player_stats_player ON public.player_stats USING btree (player_id);


--
-- TOC entry 4538 (class 1259 OID 18336)
-- Name: idx_player_stats_player_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_player_stats_player_id ON public.player_stats USING btree (player_id);


--
-- TOC entry 4539 (class 1259 OID 17958)
-- Name: idx_player_stats_team; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_player_stats_team ON public.player_stats USING btree (team_id);


--
-- TOC entry 4501 (class 1259 OID 18348)
-- Name: idx_players_last_synced; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_players_last_synced ON public.players USING btree (last_synced) WHERE (last_synced IS NOT NULL);


--
-- TOC entry 4502 (class 1259 OID 17768)
-- Name: idx_players_name_trgm; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_players_name_trgm ON public.players USING gin (summoner_name public.gin_trgm_ops);


--
-- TOC entry 4503 (class 1259 OID 17767)
-- Name: idx_players_puuid; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_players_puuid ON public.players USING btree (puuid);


--
-- TOC entry 4504 (class 1259 OID 18537)
-- Name: idx_players_summoner_name_trgm; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_players_summoner_name_trgm ON public.players USING gin (summoner_name public.gin_trgm_ops);


--
-- TOC entry 4505 (class 1259 OID 17766)
-- Name: idx_players_team_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_players_team_id ON public.players USING btree (team_id);


--
-- TOC entry 4506 (class 1259 OID 18536)
-- Name: idx_players_team_role; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_players_team_role ON public.players USING btree (team_id, role);


--
-- TOC entry 4581 (class 1259 OID 18483)
-- Name: idx_rank_snapshots_account_queue; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_rank_snapshots_account_queue ON public.rank_snapshots USING btree (riot_account_id, queue_type);


--
-- TOC entry 4582 (class 1259 OID 18482)
-- Name: idx_rank_snapshots_account_time; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_rank_snapshots_account_time ON public.rank_snapshots USING btree (riot_account_id, snapshotted_at DESC);


--
-- TOC entry 4576 (class 1259 OID 18459)
-- Name: idx_riot_accounts_primary_per_profile; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX idx_riot_accounts_primary_per_profile ON public.riot_accounts USING btree (profile_id) WHERE (is_primary = true);


--
-- TOC entry 4577 (class 1259 OID 18460)
-- Name: idx_riot_accounts_profile_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_riot_accounts_profile_id ON public.riot_accounts USING btree (profile_id);


--
-- TOC entry 4578 (class 1259 OID 18458)
-- Name: idx_riot_accounts_puuid; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX idx_riot_accounts_puuid ON public.riot_accounts USING btree (puuid);


--
-- TOC entry 4553 (class 1259 OID 18345)
-- Name: idx_seedings_seed; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_seedings_seed ON public.seedings USING btree (tournament_id, seed);


--
-- TOC entry 4554 (class 1259 OID 18344)
-- Name: idx_seedings_tournament; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_seedings_tournament ON public.seedings USING btree (tournament_id);


--
-- TOC entry 4527 (class 1259 OID 17885)
-- Name: idx_stages_tournament; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_stages_tournament ON public.tournament_stages USING btree (tournament_id);


--
-- TOC entry 4491 (class 1259 OID 18606)
-- Name: idx_tournaments_slug; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_tournaments_slug ON public.tournaments USING btree (slug);


--
-- TOC entry 4550 (class 1259 OID 18433)
-- Name: notifications_user_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX notifications_user_id_idx ON public.notifications USING btree (user_id, created_at DESC);


--
-- TOC entry 4494 (class 1259 OID 18320)
-- Name: tournaments_slug_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX tournaments_slug_idx ON public.tournaments USING btree (slug);


--
-- TOC entry 4482 (class 1259 OID 17544)
-- Name: ix_realtime_subscription_entity; Type: INDEX; Schema: realtime; Owner: supabase_admin
--

CREATE INDEX ix_realtime_subscription_entity ON realtime.subscription USING btree (entity);


--
-- TOC entry 4486 (class 1259 OID 17545)
-- Name: messages_inserted_at_topic_index; Type: INDEX; Schema: realtime; Owner: supabase_realtime_admin
--

CREATE INDEX messages_inserted_at_topic_index ON ONLY realtime.messages USING btree (inserted_at DESC, topic) WHERE ((extension = 'broadcast'::text) AND (private IS TRUE));


--
-- TOC entry 4590 (class 1259 OID 18551)
-- Name: messages_2026_04_22_inserted_at_topic_idx; Type: INDEX; Schema: realtime; Owner: supabase_admin
--

CREATE INDEX messages_2026_04_22_inserted_at_topic_idx ON realtime.messages_2026_04_22 USING btree (inserted_at DESC, topic) WHERE ((extension = 'broadcast'::text) AND (private IS TRUE));


--
-- TOC entry 4593 (class 1259 OID 18563)
-- Name: messages_2026_04_23_inserted_at_topic_idx; Type: INDEX; Schema: realtime; Owner: supabase_admin
--

CREATE INDEX messages_2026_04_23_inserted_at_topic_idx ON realtime.messages_2026_04_23 USING btree (inserted_at DESC, topic) WHERE ((extension = 'broadcast'::text) AND (private IS TRUE));


--
-- TOC entry 4596 (class 1259 OID 18575)
-- Name: messages_2026_04_24_inserted_at_topic_idx; Type: INDEX; Schema: realtime; Owner: supabase_admin
--

CREATE INDEX messages_2026_04_24_inserted_at_topic_idx ON realtime.messages_2026_04_24 USING btree (inserted_at DESC, topic) WHERE ((extension = 'broadcast'::text) AND (private IS TRUE));


--
-- TOC entry 4599 (class 1259 OID 18587)
-- Name: messages_2026_04_25_inserted_at_topic_idx; Type: INDEX; Schema: realtime; Owner: supabase_admin
--

CREATE INDEX messages_2026_04_25_inserted_at_topic_idx ON realtime.messages_2026_04_25 USING btree (inserted_at DESC, topic) WHERE ((extension = 'broadcast'::text) AND (private IS TRUE));


--
-- TOC entry 4602 (class 1259 OID 18599)
-- Name: messages_2026_04_26_inserted_at_topic_idx; Type: INDEX; Schema: realtime; Owner: supabase_admin
--

CREATE INDEX messages_2026_04_26_inserted_at_topic_idx ON realtime.messages_2026_04_26 USING btree (inserted_at DESC, topic) WHERE ((extension = 'broadcast'::text) AND (private IS TRUE));


--
-- TOC entry 4605 (class 1259 OID 18622)
-- Name: messages_2026_04_27_inserted_at_topic_idx; Type: INDEX; Schema: realtime; Owner: supabase_admin
--

CREATE INDEX messages_2026_04_27_inserted_at_topic_idx ON realtime.messages_2026_04_27 USING btree (inserted_at DESC, topic) WHERE ((extension = 'broadcast'::text) AND (private IS TRUE));


--
-- TOC entry 4608 (class 1259 OID 18717)
-- Name: messages_2026_04_28_inserted_at_topic_idx; Type: INDEX; Schema: realtime; Owner: supabase_admin
--

CREATE INDEX messages_2026_04_28_inserted_at_topic_idx ON realtime.messages_2026_04_28 USING btree (inserted_at DESC, topic) WHERE ((extension = 'broadcast'::text) AND (private IS TRUE));


--
-- TOC entry 4485 (class 1259 OID 17548)
-- Name: subscription_subscription_id_entity_filters_action_filter_key; Type: INDEX; Schema: realtime; Owner: supabase_admin
--

CREATE UNIQUE INDEX subscription_subscription_id_entity_filters_action_filter_key ON realtime.subscription USING btree (subscription_id, entity, filters, action_filter);


--
-- TOC entry 4458 (class 1259 OID 17185)
-- Name: bname; Type: INDEX; Schema: storage; Owner: supabase_storage_admin
--

CREATE UNIQUE INDEX bname ON storage.buckets USING btree (name);


--
-- TOC entry 4461 (class 1259 OID 17202)
-- Name: bucketid_objname; Type: INDEX; Schema: storage; Owner: supabase_storage_admin
--

CREATE UNIQUE INDEX bucketid_objname ON storage.objects USING btree (bucket_id, name);


--
-- TOC entry 4474 (class 1259 OID 17343)
-- Name: buckets_analytics_unique_name_idx; Type: INDEX; Schema: storage; Owner: supabase_storage_admin
--

CREATE UNIQUE INDEX buckets_analytics_unique_name_idx ON storage.buckets_analytics USING btree (name) WHERE (deleted_at IS NULL);


--
-- TOC entry 4467 (class 1259 OID 17269)
-- Name: idx_multipart_uploads_list; Type: INDEX; Schema: storage; Owner: supabase_storage_admin
--

CREATE INDEX idx_multipart_uploads_list ON storage.s3_multipart_uploads USING btree (bucket_id, key, created_at);


--
-- TOC entry 4462 (class 1259 OID 17234)
-- Name: idx_objects_bucket_id_name; Type: INDEX; Schema: storage; Owner: supabase_storage_admin
--

CREATE INDEX idx_objects_bucket_id_name ON storage.objects USING btree (bucket_id, name COLLATE "C");


--
-- TOC entry 4463 (class 1259 OID 17350)
-- Name: idx_objects_bucket_id_name_lower; Type: INDEX; Schema: storage; Owner: supabase_storage_admin
--

CREATE INDEX idx_objects_bucket_id_name_lower ON storage.objects USING btree (bucket_id, lower(name) COLLATE "C");


--
-- TOC entry 4464 (class 1259 OID 17203)
-- Name: name_prefix_search; Type: INDEX; Schema: storage; Owner: supabase_storage_admin
--

CREATE INDEX name_prefix_search ON storage.objects USING btree (name text_pattern_ops);


--
-- TOC entry 4477 (class 1259 OID 17334)
-- Name: vector_indexes_name_bucket_id_idx; Type: INDEX; Schema: storage; Owner: supabase_storage_admin
--

CREATE UNIQUE INDEX vector_indexes_name_bucket_id_idx ON storage.vector_indexes USING btree (name, bucket_id);


--
-- TOC entry 4611 (class 0 OID 0)
-- Name: messages_2026_04_22_inserted_at_topic_idx; Type: INDEX ATTACH; Schema: realtime; Owner: supabase_realtime_admin
--

ALTER INDEX realtime.messages_inserted_at_topic_index ATTACH PARTITION realtime.messages_2026_04_22_inserted_at_topic_idx;


--
-- TOC entry 4612 (class 0 OID 0)
-- Name: messages_2026_04_22_pkey; Type: INDEX ATTACH; Schema: realtime; Owner: supabase_realtime_admin
--

ALTER INDEX realtime.messages_pkey ATTACH PARTITION realtime.messages_2026_04_22_pkey;


--
-- TOC entry 4613 (class 0 OID 0)
-- Name: messages_2026_04_23_inserted_at_topic_idx; Type: INDEX ATTACH; Schema: realtime; Owner: supabase_realtime_admin
--

ALTER INDEX realtime.messages_inserted_at_topic_index ATTACH PARTITION realtime.messages_2026_04_23_inserted_at_topic_idx;


--
-- TOC entry 4614 (class 0 OID 0)
-- Name: messages_2026_04_23_pkey; Type: INDEX ATTACH; Schema: realtime; Owner: supabase_realtime_admin
--

ALTER INDEX realtime.messages_pkey ATTACH PARTITION realtime.messages_2026_04_23_pkey;


--
-- TOC entry 4615 (class 0 OID 0)
-- Name: messages_2026_04_24_inserted_at_topic_idx; Type: INDEX ATTACH; Schema: realtime; Owner: supabase_realtime_admin
--

ALTER INDEX realtime.messages_inserted_at_topic_index ATTACH PARTITION realtime.messages_2026_04_24_inserted_at_topic_idx;


--
-- TOC entry 4616 (class 0 OID 0)
-- Name: messages_2026_04_24_pkey; Type: INDEX ATTACH; Schema: realtime; Owner: supabase_realtime_admin
--

ALTER INDEX realtime.messages_pkey ATTACH PARTITION realtime.messages_2026_04_24_pkey;


--
-- TOC entry 4617 (class 0 OID 0)
-- Name: messages_2026_04_25_inserted_at_topic_idx; Type: INDEX ATTACH; Schema: realtime; Owner: supabase_realtime_admin
--

ALTER INDEX realtime.messages_inserted_at_topic_index ATTACH PARTITION realtime.messages_2026_04_25_inserted_at_topic_idx;


--
-- TOC entry 4618 (class 0 OID 0)
-- Name: messages_2026_04_25_pkey; Type: INDEX ATTACH; Schema: realtime; Owner: supabase_realtime_admin
--

ALTER INDEX realtime.messages_pkey ATTACH PARTITION realtime.messages_2026_04_25_pkey;


--
-- TOC entry 4619 (class 0 OID 0)
-- Name: messages_2026_04_26_inserted_at_topic_idx; Type: INDEX ATTACH; Schema: realtime; Owner: supabase_realtime_admin
--

ALTER INDEX realtime.messages_inserted_at_topic_index ATTACH PARTITION realtime.messages_2026_04_26_inserted_at_topic_idx;


--
-- TOC entry 4620 (class 0 OID 0)
-- Name: messages_2026_04_26_pkey; Type: INDEX ATTACH; Schema: realtime; Owner: supabase_realtime_admin
--

ALTER INDEX realtime.messages_pkey ATTACH PARTITION realtime.messages_2026_04_26_pkey;


--
-- TOC entry 4621 (class 0 OID 0)
-- Name: messages_2026_04_27_inserted_at_topic_idx; Type: INDEX ATTACH; Schema: realtime; Owner: supabase_realtime_admin
--

ALTER INDEX realtime.messages_inserted_at_topic_index ATTACH PARTITION realtime.messages_2026_04_27_inserted_at_topic_idx;


--
-- TOC entry 4622 (class 0 OID 0)
-- Name: messages_2026_04_27_pkey; Type: INDEX ATTACH; Schema: realtime; Owner: supabase_realtime_admin
--

ALTER INDEX realtime.messages_pkey ATTACH PARTITION realtime.messages_2026_04_27_pkey;


--
-- TOC entry 4623 (class 0 OID 0)
-- Name: messages_2026_04_28_inserted_at_topic_idx; Type: INDEX ATTACH; Schema: realtime; Owner: supabase_realtime_admin
--

ALTER INDEX realtime.messages_inserted_at_topic_index ATTACH PARTITION realtime.messages_2026_04_28_inserted_at_topic_idx;


--
-- TOC entry 4624 (class 0 OID 0)
-- Name: messages_2026_04_28_pkey; Type: INDEX ATTACH; Schema: realtime; Owner: supabase_realtime_admin
--

ALTER INDEX realtime.messages_pkey ATTACH PARTITION realtime.messages_2026_04_28_pkey;


--
-- TOC entry 4682 (class 2620 OID 17698)
-- Name: users on_auth_user_created; Type: TRIGGER; Schema: auth; Owner: supabase_auth_admin
--

CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


--
-- TOC entry 4695 (class 2620 OID 18254)
-- Name: matches audit_matches_trigger; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER audit_matches_trigger AFTER INSERT OR UPDATE ON public.matches FOR EACH ROW EXECUTE FUNCTION public.audit_matches_changes();


--
-- TOC entry 4689 (class 2620 OID 18322)
-- Name: tournaments set_tournament_slug; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER set_tournament_slug BEFORE INSERT OR UPDATE ON public.tournaments FOR EACH ROW EXECUTE FUNCTION public.generate_tournament_slug();


--
-- TOC entry 4702 (class 2620 OID 18504)
-- Name: champion_masteries trg_champion_masteries_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_champion_masteries_updated_at BEFORE UPDATE ON public.champion_masteries FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- TOC entry 4693 (class 2620 OID 18531)
-- Name: inscricoes trg_inscricao_nova; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_inscricao_nova AFTER INSERT ON public.inscricoes FOR EACH ROW EXECUTE FUNCTION public.trg_inscricao_nova();


--
-- TOC entry 4694 (class 2620 OID 18532)
-- Name: inscricoes trg_inscricao_status_change; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_inscricao_status_change AFTER UPDATE ON public.inscricoes FOR EACH ROW EXECUTE FUNCTION public.trg_inscricao_status_change();


--
-- TOC entry 4696 (class 2620 OID 18533)
-- Name: matches trg_match_finished; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_match_finished AFTER UPDATE ON public.matches FOR EACH ROW EXECUTE FUNCTION public.trg_match_finished();


--
-- TOC entry 4697 (class 2620 OID 17843)
-- Name: matches trg_matches_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_matches_updated_at BEFORE UPDATE ON public.matches FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- TOC entry 4699 (class 2620 OID 18523)
-- Name: notifications trg_notifications_sync_body_message; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_notifications_sync_body_message BEFORE INSERT OR UPDATE ON public.notifications FOR EACH ROW EXECUTE FUNCTION public.sync_notifications_body_message();


--
-- TOC entry 4692 (class 2620 OID 17842)
-- Name: players trg_players_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_players_updated_at BEFORE UPDATE ON public.players FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- TOC entry 4688 (class 2620 OID 17840)
-- Name: profiles trg_profiles_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- TOC entry 4700 (class 2620 OID 18463)
-- Name: riot_accounts trg_riot_accounts_primary; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_riot_accounts_primary BEFORE INSERT OR UPDATE ON public.riot_accounts FOR EACH ROW EXECUTE FUNCTION public.ensure_single_primary_riot_account();


--
-- TOC entry 4701 (class 2620 OID 18462)
-- Name: riot_accounts trg_riot_accounts_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_riot_accounts_updated_at BEFORE UPDATE ON public.riot_accounts FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- TOC entry 4698 (class 2620 OID 17886)
-- Name: tournament_stages trg_stages_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_stages_updated_at BEFORE UPDATE ON public.tournament_stages FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- TOC entry 4690 (class 2620 OID 18534)
-- Name: tournaments trg_tournament_started; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_tournament_started AFTER UPDATE ON public.tournaments FOR EACH ROW EXECUTE FUNCTION public.trg_tournament_started();


--
-- TOC entry 4691 (class 2620 OID 17841)
-- Name: tournaments trg_tournaments_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_tournaments_updated_at BEFORE UPDATE ON public.tournaments FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- TOC entry 4687 (class 2620 OID 17402)
-- Name: subscription tr_check_filters; Type: TRIGGER; Schema: realtime; Owner: supabase_admin
--

CREATE TRIGGER tr_check_filters BEFORE INSERT OR UPDATE ON realtime.subscription FOR EACH ROW EXECUTE FUNCTION realtime.subscription_check_filters();


--
-- TOC entry 4683 (class 2620 OID 17288)
-- Name: buckets enforce_bucket_name_length_trigger; Type: TRIGGER; Schema: storage; Owner: supabase_storage_admin
--

CREATE TRIGGER enforce_bucket_name_length_trigger BEFORE INSERT OR UPDATE OF name ON storage.buckets FOR EACH ROW EXECUTE FUNCTION storage.enforce_bucket_name_length();


--
-- TOC entry 4684 (class 2620 OID 17352)
-- Name: buckets protect_buckets_delete; Type: TRIGGER; Schema: storage; Owner: supabase_storage_admin
--

CREATE TRIGGER protect_buckets_delete BEFORE DELETE ON storage.buckets FOR EACH STATEMENT EXECUTE FUNCTION storage.protect_delete();


--
-- TOC entry 4685 (class 2620 OID 17353)
-- Name: objects protect_objects_delete; Type: TRIGGER; Schema: storage; Owner: supabase_storage_admin
--

CREATE TRIGGER protect_objects_delete BEFORE DELETE ON storage.objects FOR EACH STATEMENT EXECUTE FUNCTION storage.protect_delete();


--
-- TOC entry 4686 (class 2620 OID 17222)
-- Name: objects update_objects_updated_at; Type: TRIGGER; Schema: storage; Owner: supabase_storage_admin
--

CREATE TRIGGER update_objects_updated_at BEFORE UPDATE ON storage.objects FOR EACH ROW EXECUTE FUNCTION storage.update_updated_at_column();


--
-- TOC entry 4626 (class 2606 OID 16691)
-- Name: identities identities_user_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.identities
    ADD CONSTRAINT identities_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- TOC entry 4631 (class 2606 OID 16781)
-- Name: mfa_amr_claims mfa_amr_claims_session_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.mfa_amr_claims
    ADD CONSTRAINT mfa_amr_claims_session_id_fkey FOREIGN KEY (session_id) REFERENCES auth.sessions(id) ON DELETE CASCADE;


--
-- TOC entry 4630 (class 2606 OID 16769)
-- Name: mfa_challenges mfa_challenges_auth_factor_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.mfa_challenges
    ADD CONSTRAINT mfa_challenges_auth_factor_id_fkey FOREIGN KEY (factor_id) REFERENCES auth.mfa_factors(id) ON DELETE CASCADE;


--
-- TOC entry 4629 (class 2606 OID 16756)
-- Name: mfa_factors mfa_factors_user_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.mfa_factors
    ADD CONSTRAINT mfa_factors_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- TOC entry 4637 (class 2606 OID 17021)
-- Name: oauth_authorizations oauth_authorizations_client_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.oauth_authorizations
    ADD CONSTRAINT oauth_authorizations_client_id_fkey FOREIGN KEY (client_id) REFERENCES auth.oauth_clients(id) ON DELETE CASCADE;


--
-- TOC entry 4638 (class 2606 OID 17026)
-- Name: oauth_authorizations oauth_authorizations_user_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.oauth_authorizations
    ADD CONSTRAINT oauth_authorizations_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- TOC entry 4639 (class 2606 OID 17050)
-- Name: oauth_consents oauth_consents_client_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.oauth_consents
    ADD CONSTRAINT oauth_consents_client_id_fkey FOREIGN KEY (client_id) REFERENCES auth.oauth_clients(id) ON DELETE CASCADE;


--
-- TOC entry 4640 (class 2606 OID 17045)
-- Name: oauth_consents oauth_consents_user_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.oauth_consents
    ADD CONSTRAINT oauth_consents_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- TOC entry 4636 (class 2606 OID 16947)
-- Name: one_time_tokens one_time_tokens_user_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.one_time_tokens
    ADD CONSTRAINT one_time_tokens_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- TOC entry 4625 (class 2606 OID 16724)
-- Name: refresh_tokens refresh_tokens_session_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.refresh_tokens
    ADD CONSTRAINT refresh_tokens_session_id_fkey FOREIGN KEY (session_id) REFERENCES auth.sessions(id) ON DELETE CASCADE;


--
-- TOC entry 4633 (class 2606 OID 16828)
-- Name: saml_providers saml_providers_sso_provider_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.saml_providers
    ADD CONSTRAINT saml_providers_sso_provider_id_fkey FOREIGN KEY (sso_provider_id) REFERENCES auth.sso_providers(id) ON DELETE CASCADE;


--
-- TOC entry 4634 (class 2606 OID 16901)
-- Name: saml_relay_states saml_relay_states_flow_state_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.saml_relay_states
    ADD CONSTRAINT saml_relay_states_flow_state_id_fkey FOREIGN KEY (flow_state_id) REFERENCES auth.flow_state(id) ON DELETE CASCADE;


--
-- TOC entry 4635 (class 2606 OID 16842)
-- Name: saml_relay_states saml_relay_states_sso_provider_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.saml_relay_states
    ADD CONSTRAINT saml_relay_states_sso_provider_id_fkey FOREIGN KEY (sso_provider_id) REFERENCES auth.sso_providers(id) ON DELETE CASCADE;


--
-- TOC entry 4627 (class 2606 OID 17064)
-- Name: sessions sessions_oauth_client_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.sessions
    ADD CONSTRAINT sessions_oauth_client_id_fkey FOREIGN KEY (oauth_client_id) REFERENCES auth.oauth_clients(id) ON DELETE CASCADE;


--
-- TOC entry 4628 (class 2606 OID 16719)
-- Name: sessions sessions_user_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.sessions
    ADD CONSTRAINT sessions_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- TOC entry 4632 (class 2606 OID 16809)
-- Name: sso_domains sso_domains_sso_provider_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.sso_domains
    ADD CONSTRAINT sso_domains_sso_provider_id_fkey FOREIGN KEY (sso_provider_id) REFERENCES auth.sso_providers(id) ON DELETE CASCADE;


--
-- TOC entry 4642 (class 2606 OID 17157)
-- Name: webauthn_challenges webauthn_challenges_user_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.webauthn_challenges
    ADD CONSTRAINT webauthn_challenges_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- TOC entry 4641 (class 2606 OID 17140)
-- Name: webauthn_credentials webauthn_credentials_user_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.webauthn_credentials
    ADD CONSTRAINT webauthn_credentials_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- TOC entry 4678 (class 2606 OID 18242)
-- Name: audit_log audit_log_admin_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.audit_log
    ADD CONSTRAINT audit_log_admin_id_fkey FOREIGN KEY (admin_id) REFERENCES auth.users(id) ON DELETE SET NULL;


--
-- TOC entry 4681 (class 2606 OID 18498)
-- Name: champion_masteries champion_masteries_riot_account_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.champion_masteries
    ADD CONSTRAINT champion_masteries_riot_account_id_fkey FOREIGN KEY (riot_account_id) REFERENCES public.riot_accounts(id) ON DELETE CASCADE;


--
-- TOC entry 4674 (class 2606 OID 18200)
-- Name: disputes disputes_match_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.disputes
    ADD CONSTRAINT disputes_match_id_fkey FOREIGN KEY (match_id) REFERENCES public.matches(id) ON DELETE CASCADE;


--
-- TOC entry 4675 (class 2606 OID 18205)
-- Name: disputes disputes_reported_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.disputes
    ADD CONSTRAINT disputes_reported_by_fkey FOREIGN KEY (reported_by) REFERENCES public.profiles(id);


--
-- TOC entry 4676 (class 2606 OID 18210)
-- Name: disputes disputes_resolved_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.disputes
    ADD CONSTRAINT disputes_resolved_by_fkey FOREIGN KEY (resolved_by) REFERENCES public.profiles(id);


--
-- TOC entry 4653 (class 2606 OID 17791)
-- Name: inscricoes inscricoes_requested_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.inscricoes
    ADD CONSTRAINT inscricoes_requested_by_fkey FOREIGN KEY (requested_by) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- TOC entry 4654 (class 2606 OID 17796)
-- Name: inscricoes inscricoes_reviewed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.inscricoes
    ADD CONSTRAINT inscricoes_reviewed_by_fkey FOREIGN KEY (reviewed_by) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- TOC entry 4655 (class 2606 OID 17786)
-- Name: inscricoes inscricoes_team_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.inscricoes
    ADD CONSTRAINT inscricoes_team_id_fkey FOREIGN KEY (team_id) REFERENCES public.teams(id) ON DELETE CASCADE;


--
-- TOC entry 4656 (class 2606 OID 17781)
-- Name: inscricoes inscricoes_tournament_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.inscricoes
    ADD CONSTRAINT inscricoes_tournament_id_fkey FOREIGN KEY (tournament_id) REFERENCES public.tournaments(id) ON DELETE CASCADE;


--
-- TOC entry 4663 (class 2606 OID 17908)
-- Name: match_games match_games_match_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.match_games
    ADD CONSTRAINT match_games_match_id_fkey FOREIGN KEY (match_id) REFERENCES public.matches(id) ON DELETE CASCADE;


--
-- TOC entry 4664 (class 2606 OID 17913)
-- Name: match_games match_games_winner_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.match_games
    ADD CONSTRAINT match_games_winner_id_fkey FOREIGN KEY (winner_id) REFERENCES public.teams(id) ON DELETE SET NULL;


--
-- TOC entry 4657 (class 2606 OID 17889)
-- Name: matches matches_stage_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.matches
    ADD CONSTRAINT matches_stage_id_fkey FOREIGN KEY (stage_id) REFERENCES public.tournament_stages(id) ON DELETE SET NULL;


--
-- TOC entry 4658 (class 2606 OID 17822)
-- Name: matches matches_team_a_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.matches
    ADD CONSTRAINT matches_team_a_id_fkey FOREIGN KEY (team_a_id) REFERENCES public.teams(id) ON DELETE SET NULL;


--
-- TOC entry 4659 (class 2606 OID 17827)
-- Name: matches matches_team_b_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.matches
    ADD CONSTRAINT matches_team_b_id_fkey FOREIGN KEY (team_b_id) REFERENCES public.teams(id) ON DELETE SET NULL;


--
-- TOC entry 4660 (class 2606 OID 17817)
-- Name: matches matches_tournament_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.matches
    ADD CONSTRAINT matches_tournament_id_fkey FOREIGN KEY (tournament_id) REFERENCES public.tournaments(id) ON DELETE CASCADE;


--
-- TOC entry 4661 (class 2606 OID 17832)
-- Name: matches matches_winner_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.matches
    ADD CONSTRAINT matches_winner_id_fkey FOREIGN KEY (winner_id) REFERENCES public.teams(id) ON DELETE SET NULL;


--
-- TOC entry 4668 (class 2606 OID 18517)
-- Name: notifications notifications_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- TOC entry 4665 (class 2606 OID 17941)
-- Name: player_stats player_stats_game_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.player_stats
    ADD CONSTRAINT player_stats_game_id_fkey FOREIGN KEY (game_id) REFERENCES public.match_games(id) ON DELETE CASCADE;


--
-- TOC entry 4666 (class 2606 OID 17946)
-- Name: player_stats player_stats_player_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.player_stats
    ADD CONSTRAINT player_stats_player_id_fkey FOREIGN KEY (player_id) REFERENCES public.players(id) ON DELETE SET NULL;


--
-- TOC entry 4667 (class 2606 OID 17951)
-- Name: player_stats player_stats_team_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.player_stats
    ADD CONSTRAINT player_stats_team_id_fkey FOREIGN KEY (team_id) REFERENCES public.teams(id) ON DELETE SET NULL;


--
-- TOC entry 4652 (class 2606 OID 17761)
-- Name: players players_team_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.players
    ADD CONSTRAINT players_team_id_fkey FOREIGN KEY (team_id) REFERENCES public.teams(id) ON DELETE SET NULL;


--
-- TOC entry 4669 (class 2606 OID 18116)
-- Name: prize_distribution prize_distribution_tournament_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.prize_distribution
    ADD CONSTRAINT prize_distribution_tournament_id_fkey FOREIGN KEY (tournament_id) REFERENCES public.tournaments(id) ON DELETE CASCADE;


--
-- TOC entry 4648 (class 2606 OID 17692)
-- Name: profiles profiles_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- TOC entry 4680 (class 2606 OID 18477)
-- Name: rank_snapshots rank_snapshots_riot_account_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.rank_snapshots
    ADD CONSTRAINT rank_snapshots_riot_account_id_fkey FOREIGN KEY (riot_account_id) REFERENCES public.riot_accounts(id) ON DELETE CASCADE;


--
-- TOC entry 4679 (class 2606 OID 18453)
-- Name: riot_accounts riot_accounts_profile_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.riot_accounts
    ADD CONSTRAINT riot_accounts_profile_id_fkey FOREIGN KEY (profile_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- TOC entry 4670 (class 2606 OID 18142)
-- Name: seedings seedings_team_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.seedings
    ADD CONSTRAINT seedings_team_id_fkey FOREIGN KEY (team_id) REFERENCES public.teams(id) ON DELETE CASCADE;


--
-- TOC entry 4671 (class 2606 OID 18137)
-- Name: seedings seedings_tournament_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.seedings
    ADD CONSTRAINT seedings_tournament_id_fkey FOREIGN KEY (tournament_id) REFERENCES public.tournaments(id) ON DELETE CASCADE;


--
-- TOC entry 4672 (class 2606 OID 18174)
-- Name: team_invites team_invites_invited_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.team_invites
    ADD CONSTRAINT team_invites_invited_by_fkey FOREIGN KEY (invited_by) REFERENCES public.profiles(id);


--
-- TOC entry 4673 (class 2606 OID 18169)
-- Name: team_invites team_invites_team_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.team_invites
    ADD CONSTRAINT team_invites_team_id_fkey FOREIGN KEY (team_id) REFERENCES public.teams(id) ON DELETE CASCADE;


--
-- TOC entry 4650 (class 2606 OID 17735)
-- Name: teams teams_owner_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.teams
    ADD CONSTRAINT teams_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- TOC entry 4651 (class 2606 OID 17730)
-- Name: teams teams_tournament_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.teams
    ADD CONSTRAINT teams_tournament_id_fkey FOREIGN KEY (tournament_id) REFERENCES public.tournaments(id) ON DELETE CASCADE;


--
-- TOC entry 4677 (class 2606 OID 18225)
-- Name: tournament_rules tournament_rules_tournament_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tournament_rules
    ADD CONSTRAINT tournament_rules_tournament_id_fkey FOREIGN KEY (tournament_id) REFERENCES public.tournaments(id) ON DELETE CASCADE;


--
-- TOC entry 4662 (class 2606 OID 17880)
-- Name: tournament_stages tournament_stages_tournament_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tournament_stages
    ADD CONSTRAINT tournament_stages_tournament_id_fkey FOREIGN KEY (tournament_id) REFERENCES public.tournaments(id) ON DELETE CASCADE;


--
-- TOC entry 4649 (class 2606 OID 17713)
-- Name: tournaments tournaments_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tournaments
    ADD CONSTRAINT tournaments_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- TOC entry 4643 (class 2606 OID 17197)
-- Name: objects objects_bucketId_fkey; Type: FK CONSTRAINT; Schema: storage; Owner: supabase_storage_admin
--

ALTER TABLE ONLY storage.objects
    ADD CONSTRAINT "objects_bucketId_fkey" FOREIGN KEY (bucket_id) REFERENCES storage.buckets(id);


--
-- TOC entry 4644 (class 2606 OID 17244)
-- Name: s3_multipart_uploads s3_multipart_uploads_bucket_id_fkey; Type: FK CONSTRAINT; Schema: storage; Owner: supabase_storage_admin
--

ALTER TABLE ONLY storage.s3_multipart_uploads
    ADD CONSTRAINT s3_multipart_uploads_bucket_id_fkey FOREIGN KEY (bucket_id) REFERENCES storage.buckets(id);


--
-- TOC entry 4645 (class 2606 OID 17264)
-- Name: s3_multipart_uploads_parts s3_multipart_uploads_parts_bucket_id_fkey; Type: FK CONSTRAINT; Schema: storage; Owner: supabase_storage_admin
--

ALTER TABLE ONLY storage.s3_multipart_uploads_parts
    ADD CONSTRAINT s3_multipart_uploads_parts_bucket_id_fkey FOREIGN KEY (bucket_id) REFERENCES storage.buckets(id);


--
-- TOC entry 4646 (class 2606 OID 17259)
-- Name: s3_multipart_uploads_parts s3_multipart_uploads_parts_upload_id_fkey; Type: FK CONSTRAINT; Schema: storage; Owner: supabase_storage_admin
--

ALTER TABLE ONLY storage.s3_multipart_uploads_parts
    ADD CONSTRAINT s3_multipart_uploads_parts_upload_id_fkey FOREIGN KEY (upload_id) REFERENCES storage.s3_multipart_uploads(id) ON DELETE CASCADE;


--
-- TOC entry 4647 (class 2606 OID 17329)
-- Name: vector_indexes vector_indexes_bucket_id_fkey; Type: FK CONSTRAINT; Schema: storage; Owner: supabase_storage_admin
--

ALTER TABLE ONLY storage.vector_indexes
    ADD CONSTRAINT vector_indexes_bucket_id_fkey FOREIGN KEY (bucket_id) REFERENCES storage.buckets_vectors(id);


--
-- TOC entry 4857 (class 0 OID 16529)
-- Dependencies: 307
-- Name: audit_log_entries; Type: ROW SECURITY; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE auth.audit_log_entries ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 4868 (class 0 OID 16887)
-- Dependencies: 321
-- Name: flow_state; Type: ROW SECURITY; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE auth.flow_state ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 4859 (class 0 OID 16684)
-- Dependencies: 312
-- Name: identities; Type: ROW SECURITY; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE auth.identities ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 4856 (class 0 OID 16522)
-- Dependencies: 306
-- Name: instances; Type: ROW SECURITY; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE auth.instances ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 4863 (class 0 OID 16774)
-- Dependencies: 316
-- Name: mfa_amr_claims; Type: ROW SECURITY; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE auth.mfa_amr_claims ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 4862 (class 0 OID 16762)
-- Dependencies: 315
-- Name: mfa_challenges; Type: ROW SECURITY; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE auth.mfa_challenges ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 4861 (class 0 OID 16749)
-- Dependencies: 314
-- Name: mfa_factors; Type: ROW SECURITY; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE auth.mfa_factors ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 4869 (class 0 OID 16937)
-- Dependencies: 322
-- Name: one_time_tokens; Type: ROW SECURITY; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE auth.one_time_tokens ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 4855 (class 0 OID 16511)
-- Dependencies: 305
-- Name: refresh_tokens; Type: ROW SECURITY; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE auth.refresh_tokens ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 4866 (class 0 OID 16816)
-- Dependencies: 319
-- Name: saml_providers; Type: ROW SECURITY; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE auth.saml_providers ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 4867 (class 0 OID 16834)
-- Dependencies: 320
-- Name: saml_relay_states; Type: ROW SECURITY; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE auth.saml_relay_states ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 4858 (class 0 OID 16537)
-- Dependencies: 308
-- Name: schema_migrations; Type: ROW SECURITY; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE auth.schema_migrations ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 4860 (class 0 OID 16714)
-- Dependencies: 313
-- Name: sessions; Type: ROW SECURITY; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE auth.sessions ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 4865 (class 0 OID 16801)
-- Dependencies: 318
-- Name: sso_domains; Type: ROW SECURITY; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE auth.sso_domains ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 4864 (class 0 OID 16792)
-- Dependencies: 317
-- Name: sso_providers; Type: ROW SECURITY; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE auth.sso_providers ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 4854 (class 0 OID 16499)
-- Dependencies: 303
-- Name: users; Type: ROW SECURITY; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE auth.users ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 4949 (class 3256 OID 18347)
-- Name: seedings Admins can manage seedings; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Admins can manage seedings" ON public.seedings USING ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.is_admin = true)))));


--
-- TOC entry 4925 (class 3256 OID 18247)
-- Name: audit_log Admins can view audit log; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Admins can view audit log" ON public.audit_log FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.is_admin = true)))));


--
-- TOC entry 4948 (class 3256 OID 18346)
-- Name: seedings Public can view seedings; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Public can view seedings" ON public.seedings FOR SELECT USING (true);


--
-- TOC entry 4966 (class 3256 OID 18625)
-- Name: profiles admin_read_all_profiles; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY admin_read_all_profiles ON public.profiles FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.profiles p
  WHERE ((p.id = auth.uid()) AND (p.is_admin = true)))));


--
-- TOC entry 4894 (class 0 OID 18233)
-- Dependencies: 360
-- Name: audit_log; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 4946 (class 3256 OID 18316)
-- Name: audit_log audit_log_insert_service_role; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY audit_log_insert_service_role ON public.audit_log FOR INSERT WITH CHECK ((auth.role() = 'service_role'::text));


--
-- TOC entry 4897 (class 0 OID 18484)
-- Dependencies: 372
-- Name: champion_masteries; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.champion_masteries ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 4961 (class 3256 OID 18515)
-- Name: champion_masteries champion_masteries_delete_own; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY champion_masteries_delete_own ON public.champion_masteries FOR DELETE USING ((EXISTS ( SELECT 1
   FROM public.riot_accounts ra
  WHERE ((ra.id = champion_masteries.riot_account_id) AND (ra.profile_id = auth.uid())))));


--
-- TOC entry 4959 (class 3256 OID 18512)
-- Name: champion_masteries champion_masteries_insert_own; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY champion_masteries_insert_own ON public.champion_masteries FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM public.riot_accounts ra
  WHERE ((ra.id = champion_masteries.riot_account_id) AND (ra.profile_id = auth.uid())))));


--
-- TOC entry 4958 (class 3256 OID 18511)
-- Name: champion_masteries champion_masteries_select_own; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY champion_masteries_select_own ON public.champion_masteries FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.riot_accounts ra
  WHERE ((ra.id = champion_masteries.riot_account_id) AND (ra.profile_id = auth.uid())))));


--
-- TOC entry 4960 (class 3256 OID 18513)
-- Name: champion_masteries champion_masteries_update_own; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY champion_masteries_update_own ON public.champion_masteries FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM public.riot_accounts ra
  WHERE ((ra.id = champion_masteries.riot_account_id) AND (ra.profile_id = auth.uid()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM public.riot_accounts ra
  WHERE ((ra.id = champion_masteries.riot_account_id) AND (ra.profile_id = auth.uid())))));


--
-- TOC entry 4892 (class 0 OID 18189)
-- Dependencies: 358
-- Name: disputes; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.disputes ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 4942 (class 3256 OID 18301)
-- Name: disputes disputes_delete_admin; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY disputes_delete_admin ON public.disputes FOR DELETE USING (public.is_admin(auth.uid()));


--
-- TOC entry 4940 (class 3256 OID 18299)
-- Name: disputes disputes_insert_auth; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY disputes_insert_auth ON public.disputes FOR INSERT WITH CHECK ((auth.uid() = reported_by));


--
-- TOC entry 4939 (class 3256 OID 18298)
-- Name: disputes disputes_select_auth; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY disputes_select_auth ON public.disputes FOR SELECT USING ((auth.role() = 'authenticated'::text));


--
-- TOC entry 4941 (class 3256 OID 18300)
-- Name: disputes disputes_update_admin; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY disputes_update_admin ON public.disputes FOR UPDATE USING (public.is_admin(auth.uid()));


--
-- TOC entry 4883 (class 0 OID 17769)
-- Dependencies: 349
-- Name: inscricoes; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.inscricoes ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 4916 (class 3256 OID 17863)
-- Name: inscricoes inscricoes_delete_admin; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY inscricoes_delete_admin ON public.inscricoes FOR DELETE USING (public.is_admin(auth.uid()));


--
-- TOC entry 4914 (class 3256 OID 17861)
-- Name: inscricoes inscricoes_insert_user; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY inscricoes_insert_user ON public.inscricoes FOR INSERT WITH CHECK ((auth.uid() = requested_by));


--
-- TOC entry 4913 (class 3256 OID 17860)
-- Name: inscricoes inscricoes_select_auth; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY inscricoes_select_auth ON public.inscricoes FOR SELECT USING ((auth.role() = 'authenticated'::text));


--
-- TOC entry 4915 (class 3256 OID 17862)
-- Name: inscricoes inscricoes_update_admin; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY inscricoes_update_admin ON public.inscricoes FOR UPDATE USING (public.is_admin(auth.uid()));


--
-- TOC entry 4886 (class 0 OID 17895)
-- Dependencies: 352
-- Name: match_games; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.match_games ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 4922 (class 3256 OID 17998)
-- Name: match_games match_games_all_admin; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY match_games_all_admin ON public.match_games USING (public.is_admin(auth.uid()));


--
-- TOC entry 4921 (class 3256 OID 17997)
-- Name: match_games match_games_select_all; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY match_games_select_all ON public.match_games FOR SELECT USING (true);


--
-- TOC entry 4884 (class 0 OID 17801)
-- Dependencies: 350
-- Name: matches; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 4918 (class 3256 OID 17865)
-- Name: matches matches_all_admin; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY matches_all_admin ON public.matches USING (public.is_admin(auth.uid()));


--
-- TOC entry 4917 (class 3256 OID 17864)
-- Name: matches matches_select_all; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY matches_select_all ON public.matches FOR SELECT USING (true);


--
-- TOC entry 4888 (class 0 OID 17977)
-- Dependencies: 354
-- Name: notifications; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 4965 (class 3256 OID 18529)
-- Name: notifications notifications_delete_own; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY notifications_delete_own ON public.notifications FOR DELETE USING ((auth.uid() = user_id));


--
-- TOC entry 4963 (class 3256 OID 18527)
-- Name: notifications notifications_insert_own; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY notifications_insert_own ON public.notifications FOR INSERT WITH CHECK (((auth.uid() = user_id) OR (auth.role() = 'service_role'::text)));


--
-- TOC entry 4947 (class 3256 OID 18317)
-- Name: notifications notifications_insert_service_role; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY notifications_insert_service_role ON public.notifications FOR INSERT WITH CHECK ((auth.role() = 'service_role'::text));


--
-- TOC entry 4962 (class 3256 OID 18526)
-- Name: notifications notifications_select_own; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY notifications_select_own ON public.notifications FOR SELECT USING ((auth.uid() = user_id));


--
-- TOC entry 4964 (class 3256 OID 18528)
-- Name: notifications notifications_update_own; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY notifications_update_own ON public.notifications FOR UPDATE USING ((auth.uid() = user_id)) WITH CHECK ((auth.uid() = user_id));


--
-- TOC entry 4887 (class 0 OID 17919)
-- Dependencies: 353
-- Name: player_stats; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.player_stats ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 4924 (class 3256 OID 18000)
-- Name: player_stats player_stats_all_admin; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY player_stats_all_admin ON public.player_stats USING (public.is_admin(auth.uid()));


--
-- TOC entry 4923 (class 3256 OID 17999)
-- Name: player_stats player_stats_select_all; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY player_stats_select_all ON public.player_stats FOR SELECT USING (true);


--
-- TOC entry 4882 (class 0 OID 17740)
-- Dependencies: 348
-- Name: players; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.players ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 4912 (class 3256 OID 17859)
-- Name: players players_delete_admin; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY players_delete_admin ON public.players FOR DELETE USING (public.is_admin(auth.uid()));


--
-- TOC entry 4910 (class 3256 OID 17857)
-- Name: players players_insert_admin; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY players_insert_admin ON public.players FOR INSERT WITH CHECK (public.is_admin(auth.uid()));


--
-- TOC entry 4909 (class 3256 OID 17856)
-- Name: players players_select_all; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY players_select_all ON public.players FOR SELECT USING (true);


--
-- TOC entry 4911 (class 3256 OID 17858)
-- Name: players players_update_admin; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY players_update_admin ON public.players FOR UPDATE USING (public.is_admin(auth.uid()));


--
-- TOC entry 4930 (class 3256 OID 18289)
-- Name: prize_distribution prize_dist_delete_admin; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY prize_dist_delete_admin ON public.prize_distribution FOR DELETE USING (public.is_admin(auth.uid()));


--
-- TOC entry 4928 (class 3256 OID 18287)
-- Name: prize_distribution prize_dist_insert_admin; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY prize_dist_insert_admin ON public.prize_distribution FOR INSERT WITH CHECK (public.is_admin(auth.uid()));


--
-- TOC entry 4927 (class 3256 OID 18286)
-- Name: prize_distribution prize_dist_select_all; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY prize_dist_select_all ON public.prize_distribution FOR SELECT USING (true);


--
-- TOC entry 4929 (class 3256 OID 18288)
-- Name: prize_distribution prize_dist_update_admin; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY prize_dist_update_admin ON public.prize_distribution FOR UPDATE USING (public.is_admin(auth.uid()));


--
-- TOC entry 4889 (class 0 OID 18106)
-- Dependencies: 355
-- Name: prize_distribution; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.prize_distribution ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 4879 (class 0 OID 17681)
-- Dependencies: 345
-- Name: profiles; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 4967 (class 3256 OID 18626)
-- Name: profiles profiles_count_public; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY profiles_count_public ON public.profiles FOR SELECT USING (true);


--
-- TOC entry 4898 (class 3256 OID 17845)
-- Name: profiles profiles_select_all; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY profiles_select_all ON public.profiles FOR SELECT USING (true);


--
-- TOC entry 4900 (class 3256 OID 17847)
-- Name: profiles profiles_update_admin; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY profiles_update_admin ON public.profiles FOR UPDATE USING (public.is_admin(auth.uid()));


--
-- TOC entry 4899 (class 3256 OID 17846)
-- Name: profiles profiles_update_own; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY profiles_update_own ON public.profiles FOR UPDATE USING ((auth.uid() = id));


--
-- TOC entry 4896 (class 0 OID 18464)
-- Dependencies: 371
-- Name: rank_snapshots; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.rank_snapshots ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 4957 (class 3256 OID 18510)
-- Name: rank_snapshots rank_snapshots_insert_own; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY rank_snapshots_insert_own ON public.rank_snapshots FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM public.riot_accounts ra
  WHERE ((ra.id = rank_snapshots.riot_account_id) AND (ra.profile_id = auth.uid())))));


--
-- TOC entry 4956 (class 3256 OID 18509)
-- Name: rank_snapshots rank_snapshots_select_own; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY rank_snapshots_select_own ON public.rank_snapshots FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.riot_accounts ra
  WHERE ((ra.id = rank_snapshots.riot_account_id) AND (ra.profile_id = auth.uid())))));


--
-- TOC entry 4895 (class 0 OID 18442)
-- Dependencies: 370
-- Name: riot_accounts; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.riot_accounts ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 4968 (class 3256 OID 18631)
-- Name: riot_accounts riot_accounts_count_public; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY riot_accounts_count_public ON public.riot_accounts FOR SELECT USING (true);


--
-- TOC entry 4955 (class 3256 OID 18508)
-- Name: riot_accounts riot_accounts_delete_own; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY riot_accounts_delete_own ON public.riot_accounts FOR DELETE USING ((auth.uid() = profile_id));


--
-- TOC entry 4953 (class 3256 OID 18506)
-- Name: riot_accounts riot_accounts_insert_own; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY riot_accounts_insert_own ON public.riot_accounts FOR INSERT WITH CHECK ((auth.uid() = profile_id));


--
-- TOC entry 4952 (class 3256 OID 18505)
-- Name: riot_accounts riot_accounts_select_own; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY riot_accounts_select_own ON public.riot_accounts FOR SELECT USING ((auth.uid() = profile_id));


--
-- TOC entry 4954 (class 3256 OID 18507)
-- Name: riot_accounts riot_accounts_update_own; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY riot_accounts_update_own ON public.riot_accounts FOR UPDATE USING ((auth.uid() = profile_id)) WITH CHECK ((auth.uid() = profile_id));


--
-- TOC entry 4945 (class 3256 OID 18305)
-- Name: tournament_rules rules_delete_admin; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY rules_delete_admin ON public.tournament_rules FOR DELETE USING (public.is_admin(auth.uid()));


--
-- TOC entry 4926 (class 3256 OID 18303)
-- Name: tournament_rules rules_insert_admin; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY rules_insert_admin ON public.tournament_rules FOR INSERT WITH CHECK (public.is_admin(auth.uid()));


--
-- TOC entry 4943 (class 3256 OID 18302)
-- Name: tournament_rules rules_select_all; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY rules_select_all ON public.tournament_rules FOR SELECT USING (true);


--
-- TOC entry 4944 (class 3256 OID 18304)
-- Name: tournament_rules rules_update_admin; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY rules_update_admin ON public.tournament_rules FOR UPDATE USING (public.is_admin(auth.uid()));


--
-- TOC entry 4890 (class 0 OID 18121)
-- Dependencies: 356
-- Name: seedings; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.seedings ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 4934 (class 3256 OID 18293)
-- Name: seedings seedings_delete_admin; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY seedings_delete_admin ON public.seedings FOR DELETE USING (public.is_admin(auth.uid()));


--
-- TOC entry 4932 (class 3256 OID 18291)
-- Name: seedings seedings_insert_admin; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY seedings_insert_admin ON public.seedings FOR INSERT WITH CHECK (public.is_admin(auth.uid()));


--
-- TOC entry 4931 (class 3256 OID 18290)
-- Name: seedings seedings_select_all; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY seedings_select_all ON public.seedings FOR SELECT USING (true);


--
-- TOC entry 4933 (class 3256 OID 18292)
-- Name: seedings seedings_update_admin; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY seedings_update_admin ON public.seedings FOR UPDATE USING (public.is_admin(auth.uid()));


--
-- TOC entry 4920 (class 3256 OID 17996)
-- Name: tournament_stages stages_all_admin; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY stages_all_admin ON public.tournament_stages USING (public.is_admin(auth.uid()));


--
-- TOC entry 4919 (class 3256 OID 17995)
-- Name: tournament_stages stages_select_all; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY stages_select_all ON public.tournament_stages FOR SELECT USING (true);


--
-- TOC entry 4891 (class 0 OID 18157)
-- Dependencies: 357
-- Name: team_invites; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.team_invites ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 4938 (class 3256 OID 18297)
-- Name: team_invites team_invites_delete_owner_or_admin; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY team_invites_delete_owner_or_admin ON public.team_invites FOR DELETE USING ((public.is_admin(auth.uid()) OR (auth.uid() IN ( SELECT teams.owner_id
   FROM public.teams
  WHERE (teams.id = team_invites.team_id)))));


--
-- TOC entry 4936 (class 3256 OID 18295)
-- Name: team_invites team_invites_insert_owner_or_admin; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY team_invites_insert_owner_or_admin ON public.team_invites FOR INSERT WITH CHECK ((public.is_admin(auth.uid()) OR (auth.uid() IN ( SELECT teams.owner_id
   FROM public.teams
  WHERE (teams.id = team_invites.team_id)))));


--
-- TOC entry 4935 (class 3256 OID 18294)
-- Name: team_invites team_invites_select_owner_or_admin; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY team_invites_select_owner_or_admin ON public.team_invites FOR SELECT USING ((public.is_admin(auth.uid()) OR (auth.uid() IN ( SELECT teams.owner_id
   FROM public.teams
  WHERE (teams.id = team_invites.team_id)))));


--
-- TOC entry 4937 (class 3256 OID 18296)
-- Name: team_invites team_invites_update_owner_or_admin; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY team_invites_update_owner_or_admin ON public.team_invites FOR UPDATE USING ((public.is_admin(auth.uid()) OR (auth.uid() IN ( SELECT teams.owner_id
   FROM public.teams
  WHERE (teams.id = team_invites.team_id)))));


--
-- TOC entry 4881 (class 0 OID 17718)
-- Dependencies: 347
-- Name: teams; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 4908 (class 3256 OID 17855)
-- Name: teams teams_delete_admin; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY teams_delete_admin ON public.teams FOR DELETE USING (public.is_admin(auth.uid()));


--
-- TOC entry 4906 (class 3256 OID 17853)
-- Name: teams teams_insert_owner_or_admin; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY teams_insert_owner_or_admin ON public.teams FOR INSERT WITH CHECK (((auth.uid() = owner_id) OR public.is_admin(auth.uid())));


--
-- TOC entry 4905 (class 3256 OID 17852)
-- Name: teams teams_select_all; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY teams_select_all ON public.teams FOR SELECT USING (true);


--
-- TOC entry 4907 (class 3256 OID 17854)
-- Name: teams teams_update_owner_or_admin; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY teams_update_owner_or_admin ON public.teams FOR UPDATE USING (((auth.uid() = owner_id) OR public.is_admin(auth.uid())));


--
-- TOC entry 4893 (class 0 OID 18215)
-- Dependencies: 359
-- Name: tournament_rules; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.tournament_rules ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 4885 (class 0 OID 17867)
-- Dependencies: 351
-- Name: tournament_stages; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.tournament_stages ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 4880 (class 0 OID 17699)
-- Dependencies: 346
-- Name: tournaments; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.tournaments ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 4904 (class 3256 OID 17851)
-- Name: tournaments tournaments_delete_admin; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY tournaments_delete_admin ON public.tournaments FOR DELETE USING (public.is_admin(auth.uid()));


--
-- TOC entry 4902 (class 3256 OID 17849)
-- Name: tournaments tournaments_insert_admin; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY tournaments_insert_admin ON public.tournaments FOR INSERT WITH CHECK (public.is_admin(auth.uid()));


--
-- TOC entry 4901 (class 3256 OID 17848)
-- Name: tournaments tournaments_select_all; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY tournaments_select_all ON public.tournaments FOR SELECT USING (true);


--
-- TOC entry 4903 (class 3256 OID 17850)
-- Name: tournaments tournaments_update_admin; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY tournaments_update_admin ON public.tournaments FOR UPDATE USING (public.is_admin(auth.uid()));


--
-- TOC entry 4950 (class 3256 OID 18434)
-- Name: notifications users_see_own_notifications; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY users_see_own_notifications ON public.notifications FOR SELECT USING ((auth.uid() = user_id));


--
-- TOC entry 4951 (class 3256 OID 18435)
-- Name: notifications users_update_own_notifications; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY users_update_own_notifications ON public.notifications FOR UPDATE USING ((auth.uid() = user_id));


--
-- TOC entry 4878 (class 0 OID 17529)
-- Dependencies: 344
-- Name: messages; Type: ROW SECURITY; Schema: realtime; Owner: supabase_realtime_admin
--

ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 4871 (class 0 OID 17176)
-- Dependencies: 331
-- Name: buckets; Type: ROW SECURITY; Schema: storage; Owner: supabase_storage_admin
--

ALTER TABLE storage.buckets ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 4875 (class 0 OID 17296)
-- Dependencies: 335
-- Name: buckets_analytics; Type: ROW SECURITY; Schema: storage; Owner: supabase_storage_admin
--

ALTER TABLE storage.buckets_analytics ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 4876 (class 0 OID 17309)
-- Dependencies: 336
-- Name: buckets_vectors; Type: ROW SECURITY; Schema: storage; Owner: supabase_storage_admin
--

ALTER TABLE storage.buckets_vectors ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 4870 (class 0 OID 17168)
-- Dependencies: 330
-- Name: migrations; Type: ROW SECURITY; Schema: storage; Owner: supabase_storage_admin
--

ALTER TABLE storage.migrations ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 4872 (class 0 OID 17186)
-- Dependencies: 332
-- Name: objects; Type: ROW SECURITY; Schema: storage; Owner: supabase_storage_admin
--

ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 4873 (class 0 OID 17235)
-- Dependencies: 333
-- Name: s3_multipart_uploads; Type: ROW SECURITY; Schema: storage; Owner: supabase_storage_admin
--

ALTER TABLE storage.s3_multipart_uploads ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 4874 (class 0 OID 17249)
-- Dependencies: 334
-- Name: s3_multipart_uploads_parts; Type: ROW SECURITY; Schema: storage; Owner: supabase_storage_admin
--

ALTER TABLE storage.s3_multipart_uploads_parts ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 4877 (class 0 OID 17319)
-- Dependencies: 337
-- Name: vector_indexes; Type: ROW SECURITY; Schema: storage; Owner: supabase_storage_admin
--

ALTER TABLE storage.vector_indexes ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 4979 (class 0 OID 0)
-- Dependencies: 307
-- Name: TABLE audit_log_entries; Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT ALL ON TABLE auth.audit_log_entries TO dashboard_user;
GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE auth.audit_log_entries TO postgres;
GRANT SELECT ON TABLE auth.audit_log_entries TO postgres WITH GRANT OPTION;


--
-- TOC entry 4980 (class 0 OID 0)
-- Dependencies: 327
-- Name: TABLE custom_oauth_providers; Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT ALL ON TABLE auth.custom_oauth_providers TO postgres;
GRANT ALL ON TABLE auth.custom_oauth_providers TO dashboard_user;


--
-- TOC entry 4982 (class 0 OID 0)
-- Dependencies: 321
-- Name: TABLE flow_state; Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE auth.flow_state TO postgres;
GRANT SELECT ON TABLE auth.flow_state TO postgres WITH GRANT OPTION;
GRANT ALL ON TABLE auth.flow_state TO dashboard_user;


--
-- TOC entry 4985 (class 0 OID 0)
-- Dependencies: 312
-- Name: TABLE identities; Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE auth.identities TO postgres;
GRANT SELECT ON TABLE auth.identities TO postgres WITH GRANT OPTION;
GRANT ALL ON TABLE auth.identities TO dashboard_user;


--
-- TOC entry 4987 (class 0 OID 0)
-- Dependencies: 306
-- Name: TABLE instances; Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT ALL ON TABLE auth.instances TO dashboard_user;
GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE auth.instances TO postgres;
GRANT SELECT ON TABLE auth.instances TO postgres WITH GRANT OPTION;


--
-- TOC entry 4989 (class 0 OID 0)
-- Dependencies: 316
-- Name: TABLE mfa_amr_claims; Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE auth.mfa_amr_claims TO postgres;
GRANT SELECT ON TABLE auth.mfa_amr_claims TO postgres WITH GRANT OPTION;
GRANT ALL ON TABLE auth.mfa_amr_claims TO dashboard_user;


--
-- TOC entry 4991 (class 0 OID 0)
-- Dependencies: 315
-- Name: TABLE mfa_challenges; Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE auth.mfa_challenges TO postgres;
GRANT SELECT ON TABLE auth.mfa_challenges TO postgres WITH GRANT OPTION;
GRANT ALL ON TABLE auth.mfa_challenges TO dashboard_user;


--
-- TOC entry 4994 (class 0 OID 0)
-- Dependencies: 314
-- Name: TABLE mfa_factors; Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE auth.mfa_factors TO postgres;
GRANT SELECT ON TABLE auth.mfa_factors TO postgres WITH GRANT OPTION;
GRANT ALL ON TABLE auth.mfa_factors TO dashboard_user;


--
-- TOC entry 4995 (class 0 OID 0)
-- Dependencies: 324
-- Name: TABLE oauth_authorizations; Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT ALL ON TABLE auth.oauth_authorizations TO postgres;
GRANT ALL ON TABLE auth.oauth_authorizations TO dashboard_user;


--
-- TOC entry 4997 (class 0 OID 0)
-- Dependencies: 326
-- Name: TABLE oauth_client_states; Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT ALL ON TABLE auth.oauth_client_states TO postgres;
GRANT ALL ON TABLE auth.oauth_client_states TO dashboard_user;


--
-- TOC entry 4998 (class 0 OID 0)
-- Dependencies: 323
-- Name: TABLE oauth_clients; Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT ALL ON TABLE auth.oauth_clients TO postgres;
GRANT ALL ON TABLE auth.oauth_clients TO dashboard_user;


--
-- TOC entry 4999 (class 0 OID 0)
-- Dependencies: 325
-- Name: TABLE oauth_consents; Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT ALL ON TABLE auth.oauth_consents TO postgres;
GRANT ALL ON TABLE auth.oauth_consents TO dashboard_user;


--
-- TOC entry 5000 (class 0 OID 0)
-- Dependencies: 322
-- Name: TABLE one_time_tokens; Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE auth.one_time_tokens TO postgres;
GRANT SELECT ON TABLE auth.one_time_tokens TO postgres WITH GRANT OPTION;
GRANT ALL ON TABLE auth.one_time_tokens TO dashboard_user;


--
-- TOC entry 5002 (class 0 OID 0)
-- Dependencies: 305
-- Name: TABLE refresh_tokens; Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT ALL ON TABLE auth.refresh_tokens TO dashboard_user;
GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE auth.refresh_tokens TO postgres;
GRANT SELECT ON TABLE auth.refresh_tokens TO postgres WITH GRANT OPTION;


--
-- TOC entry 5004 (class 0 OID 0)
-- Dependencies: 304
-- Name: SEQUENCE refresh_tokens_id_seq; Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT ALL ON SEQUENCE auth.refresh_tokens_id_seq TO dashboard_user;
GRANT ALL ON SEQUENCE auth.refresh_tokens_id_seq TO postgres;


--
-- TOC entry 5006 (class 0 OID 0)
-- Dependencies: 319
-- Name: TABLE saml_providers; Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE auth.saml_providers TO postgres;
GRANT SELECT ON TABLE auth.saml_providers TO postgres WITH GRANT OPTION;
GRANT ALL ON TABLE auth.saml_providers TO dashboard_user;


--
-- TOC entry 5008 (class 0 OID 0)
-- Dependencies: 320
-- Name: TABLE saml_relay_states; Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE auth.saml_relay_states TO postgres;
GRANT SELECT ON TABLE auth.saml_relay_states TO postgres WITH GRANT OPTION;
GRANT ALL ON TABLE auth.saml_relay_states TO dashboard_user;


--
-- TOC entry 5010 (class 0 OID 0)
-- Dependencies: 308
-- Name: TABLE schema_migrations; Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT SELECT ON TABLE auth.schema_migrations TO postgres WITH GRANT OPTION;


--
-- TOC entry 5015 (class 0 OID 0)
-- Dependencies: 313
-- Name: TABLE sessions; Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE auth.sessions TO postgres;
GRANT SELECT ON TABLE auth.sessions TO postgres WITH GRANT OPTION;
GRANT ALL ON TABLE auth.sessions TO dashboard_user;


--
-- TOC entry 5017 (class 0 OID 0)
-- Dependencies: 318
-- Name: TABLE sso_domains; Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE auth.sso_domains TO postgres;
GRANT SELECT ON TABLE auth.sso_domains TO postgres WITH GRANT OPTION;
GRANT ALL ON TABLE auth.sso_domains TO dashboard_user;


--
-- TOC entry 5020 (class 0 OID 0)
-- Dependencies: 317
-- Name: TABLE sso_providers; Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE auth.sso_providers TO postgres;
GRANT SELECT ON TABLE auth.sso_providers TO postgres WITH GRANT OPTION;
GRANT ALL ON TABLE auth.sso_providers TO dashboard_user;


--
-- TOC entry 5023 (class 0 OID 0)
-- Dependencies: 303
-- Name: TABLE users; Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT ALL ON TABLE auth.users TO dashboard_user;
GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE auth.users TO postgres;
GRANT SELECT ON TABLE auth.users TO postgres WITH GRANT OPTION;


--
-- TOC entry 5024 (class 0 OID 0)
-- Dependencies: 329
-- Name: TABLE webauthn_challenges; Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT ALL ON TABLE auth.webauthn_challenges TO postgres;
GRANT ALL ON TABLE auth.webauthn_challenges TO dashboard_user;


--
-- TOC entry 5025 (class 0 OID 0)
-- Dependencies: 328
-- Name: TABLE webauthn_credentials; Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT ALL ON TABLE auth.webauthn_credentials TO postgres;
GRANT ALL ON TABLE auth.webauthn_credentials TO dashboard_user;


--
-- TOC entry 5026 (class 0 OID 0)
-- Dependencies: 265
-- Name: TABLE sql_features; Type: ACL; Schema: information_schema; Owner: supabase_admin
--

GRANT SELECT ON TABLE information_schema.sql_features TO PUBLIC;


--
-- TOC entry 5027 (class 0 OID 0)
-- Dependencies: 266
-- Name: TABLE sql_implementation_info; Type: ACL; Schema: information_schema; Owner: supabase_admin
--

GRANT SELECT ON TABLE information_schema.sql_implementation_info TO PUBLIC;


--
-- TOC entry 5028 (class 0 OID 0)
-- Dependencies: 268
-- Name: TABLE sql_sizing; Type: ACL; Schema: information_schema; Owner: supabase_admin
--

GRANT SELECT ON TABLE information_schema.sql_sizing TO PUBLIC;


--
-- TOC entry 5029 (class 0 OID 0)
-- Dependencies: 360
-- Name: TABLE audit_log; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.audit_log TO anon;
GRANT ALL ON TABLE public.audit_log TO authenticated;
GRANT ALL ON TABLE public.audit_log TO service_role;


--
-- TOC entry 5030 (class 0 OID 0)
-- Dependencies: 372
-- Name: TABLE champion_masteries; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.champion_masteries TO anon;
GRANT ALL ON TABLE public.champion_masteries TO authenticated;
GRANT ALL ON TABLE public.champion_masteries TO service_role;


--
-- TOC entry 5031 (class 0 OID 0)
-- Dependencies: 358
-- Name: TABLE disputes; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.disputes TO anon;
GRANT ALL ON TABLE public.disputes TO authenticated;
GRANT ALL ON TABLE public.disputes TO service_role;


--
-- TOC entry 5032 (class 0 OID 0)
-- Dependencies: 349
-- Name: TABLE inscricoes; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.inscricoes TO anon;
GRANT ALL ON TABLE public.inscricoes TO authenticated;
GRANT ALL ON TABLE public.inscricoes TO service_role;


--
-- TOC entry 5033 (class 0 OID 0)
-- Dependencies: 352
-- Name: TABLE match_games; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.match_games TO anon;
GRANT ALL ON TABLE public.match_games TO authenticated;
GRANT ALL ON TABLE public.match_games TO service_role;


--
-- TOC entry 5034 (class 0 OID 0)
-- Dependencies: 350
-- Name: TABLE matches; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.matches TO anon;
GRANT ALL ON TABLE public.matches TO authenticated;
GRANT ALL ON TABLE public.matches TO service_role;


--
-- TOC entry 5035 (class 0 OID 0)
-- Dependencies: 354
-- Name: TABLE notifications; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.notifications TO anon;
GRANT ALL ON TABLE public.notifications TO authenticated;
GRANT ALL ON TABLE public.notifications TO service_role;


--
-- TOC entry 5036 (class 0 OID 0)
-- Dependencies: 353
-- Name: TABLE player_stats; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.player_stats TO anon;
GRANT ALL ON TABLE public.player_stats TO authenticated;
GRANT ALL ON TABLE public.player_stats TO service_role;


--
-- TOC entry 5037 (class 0 OID 0)
-- Dependencies: 348
-- Name: TABLE players; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.players TO anon;
GRANT ALL ON TABLE public.players TO authenticated;
GRANT ALL ON TABLE public.players TO service_role;


--
-- TOC entry 5038 (class 0 OID 0)
-- Dependencies: 355
-- Name: TABLE prize_distribution; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.prize_distribution TO anon;
GRANT ALL ON TABLE public.prize_distribution TO authenticated;
GRANT ALL ON TABLE public.prize_distribution TO service_role;


--
-- TOC entry 5039 (class 0 OID 0)
-- Dependencies: 345
-- Name: TABLE profiles; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.profiles TO anon;
GRANT ALL ON TABLE public.profiles TO authenticated;
GRANT ALL ON TABLE public.profiles TO service_role;


--
-- TOC entry 5040 (class 0 OID 0)
-- Dependencies: 371
-- Name: TABLE rank_snapshots; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.rank_snapshots TO anon;
GRANT ALL ON TABLE public.rank_snapshots TO authenticated;
GRANT ALL ON TABLE public.rank_snapshots TO service_role;


--
-- TOC entry 5041 (class 0 OID 0)
-- Dependencies: 370
-- Name: TABLE riot_accounts; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.riot_accounts TO anon;
GRANT ALL ON TABLE public.riot_accounts TO authenticated;
GRANT ALL ON TABLE public.riot_accounts TO service_role;


--
-- TOC entry 5042 (class 0 OID 0)
-- Dependencies: 356
-- Name: TABLE seedings; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.seedings TO anon;
GRANT ALL ON TABLE public.seedings TO authenticated;
GRANT ALL ON TABLE public.seedings TO service_role;


--
-- TOC entry 5043 (class 0 OID 0)
-- Dependencies: 357
-- Name: TABLE team_invites; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.team_invites TO anon;
GRANT ALL ON TABLE public.team_invites TO authenticated;
GRANT ALL ON TABLE public.team_invites TO service_role;


--
-- TOC entry 5044 (class 0 OID 0)
-- Dependencies: 347
-- Name: TABLE teams; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.teams TO anon;
GRANT ALL ON TABLE public.teams TO authenticated;
GRANT ALL ON TABLE public.teams TO service_role;


--
-- TOC entry 5045 (class 0 OID 0)
-- Dependencies: 359
-- Name: TABLE tournament_rules; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.tournament_rules TO anon;
GRANT ALL ON TABLE public.tournament_rules TO authenticated;
GRANT ALL ON TABLE public.tournament_rules TO service_role;


--
-- TOC entry 5046 (class 0 OID 0)
-- Dependencies: 351
-- Name: TABLE tournament_stages; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.tournament_stages TO anon;
GRANT ALL ON TABLE public.tournament_stages TO authenticated;
GRANT ALL ON TABLE public.tournament_stages TO service_role;


--
-- TOC entry 5047 (class 0 OID 0)
-- Dependencies: 346
-- Name: TABLE tournaments; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.tournaments TO anon;
GRANT ALL ON TABLE public.tournaments TO authenticated;
GRANT ALL ON TABLE public.tournaments TO service_role;


--
-- TOC entry 5048 (class 0 OID 0)
-- Dependencies: 344
-- Name: TABLE messages; Type: ACL; Schema: realtime; Owner: supabase_realtime_admin
--

GRANT ALL ON TABLE realtime.messages TO postgres;
GRANT ALL ON TABLE realtime.messages TO dashboard_user;
GRANT SELECT,INSERT,UPDATE ON TABLE realtime.messages TO anon;
GRANT SELECT,INSERT,UPDATE ON TABLE realtime.messages TO authenticated;
GRANT SELECT,INSERT,UPDATE ON TABLE realtime.messages TO service_role;


--
-- TOC entry 5049 (class 0 OID 0)
-- Dependencies: 373
-- Name: TABLE messages_2026_04_22; Type: ACL; Schema: realtime; Owner: supabase_admin
--

GRANT ALL ON TABLE realtime.messages_2026_04_22 TO postgres;
GRANT ALL ON TABLE realtime.messages_2026_04_22 TO dashboard_user;


--
-- TOC entry 5050 (class 0 OID 0)
-- Dependencies: 374
-- Name: TABLE messages_2026_04_23; Type: ACL; Schema: realtime; Owner: supabase_admin
--

GRANT ALL ON TABLE realtime.messages_2026_04_23 TO postgres;
GRANT ALL ON TABLE realtime.messages_2026_04_23 TO dashboard_user;


--
-- TOC entry 5051 (class 0 OID 0)
-- Dependencies: 375
-- Name: TABLE messages_2026_04_24; Type: ACL; Schema: realtime; Owner: supabase_admin
--

GRANT ALL ON TABLE realtime.messages_2026_04_24 TO postgres;
GRANT ALL ON TABLE realtime.messages_2026_04_24 TO dashboard_user;


--
-- TOC entry 5052 (class 0 OID 0)
-- Dependencies: 376
-- Name: TABLE messages_2026_04_25; Type: ACL; Schema: realtime; Owner: supabase_admin
--

GRANT ALL ON TABLE realtime.messages_2026_04_25 TO postgres;
GRANT ALL ON TABLE realtime.messages_2026_04_25 TO dashboard_user;


--
-- TOC entry 5053 (class 0 OID 0)
-- Dependencies: 377
-- Name: TABLE messages_2026_04_26; Type: ACL; Schema: realtime; Owner: supabase_admin
--

GRANT ALL ON TABLE realtime.messages_2026_04_26 TO postgres;
GRANT ALL ON TABLE realtime.messages_2026_04_26 TO dashboard_user;


--
-- TOC entry 5054 (class 0 OID 0)
-- Dependencies: 378
-- Name: TABLE messages_2026_04_27; Type: ACL; Schema: realtime; Owner: supabase_admin
--

GRANT ALL ON TABLE realtime.messages_2026_04_27 TO postgres;
GRANT ALL ON TABLE realtime.messages_2026_04_27 TO dashboard_user;


--
-- TOC entry 5055 (class 0 OID 0)
-- Dependencies: 379
-- Name: TABLE messages_2026_04_28; Type: ACL; Schema: realtime; Owner: supabase_admin
--

GRANT ALL ON TABLE realtime.messages_2026_04_28 TO postgres;
GRANT ALL ON TABLE realtime.messages_2026_04_28 TO dashboard_user;


--
-- TOC entry 5056 (class 0 OID 0)
-- Dependencies: 338
-- Name: TABLE schema_migrations; Type: ACL; Schema: realtime; Owner: supabase_admin
--

GRANT ALL ON TABLE realtime.schema_migrations TO postgres;
GRANT ALL ON TABLE realtime.schema_migrations TO dashboard_user;
GRANT SELECT ON TABLE realtime.schema_migrations TO anon;
GRANT SELECT ON TABLE realtime.schema_migrations TO authenticated;
GRANT SELECT ON TABLE realtime.schema_migrations TO service_role;
GRANT ALL ON TABLE realtime.schema_migrations TO supabase_realtime_admin;


--
-- TOC entry 5057 (class 0 OID 0)
-- Dependencies: 341
-- Name: TABLE subscription; Type: ACL; Schema: realtime; Owner: supabase_admin
--

GRANT ALL ON TABLE realtime.subscription TO postgres;
GRANT ALL ON TABLE realtime.subscription TO dashboard_user;
GRANT SELECT ON TABLE realtime.subscription TO anon;
GRANT SELECT ON TABLE realtime.subscription TO authenticated;
GRANT SELECT ON TABLE realtime.subscription TO service_role;
GRANT ALL ON TABLE realtime.subscription TO supabase_realtime_admin;


--
-- TOC entry 5058 (class 0 OID 0)
-- Dependencies: 340
-- Name: SEQUENCE subscription_id_seq; Type: ACL; Schema: realtime; Owner: supabase_admin
--

GRANT ALL ON SEQUENCE realtime.subscription_id_seq TO postgres;
GRANT ALL ON SEQUENCE realtime.subscription_id_seq TO dashboard_user;
GRANT USAGE ON SEQUENCE realtime.subscription_id_seq TO anon;
GRANT USAGE ON SEQUENCE realtime.subscription_id_seq TO authenticated;
GRANT USAGE ON SEQUENCE realtime.subscription_id_seq TO service_role;
GRANT ALL ON SEQUENCE realtime.subscription_id_seq TO supabase_realtime_admin;


--
-- TOC entry 5060 (class 0 OID 0)
-- Dependencies: 331
-- Name: TABLE buckets; Type: ACL; Schema: storage; Owner: supabase_storage_admin
--

REVOKE ALL ON TABLE storage.buckets FROM supabase_storage_admin;
GRANT ALL ON TABLE storage.buckets TO supabase_storage_admin WITH GRANT OPTION;
GRANT ALL ON TABLE storage.buckets TO service_role;
GRANT ALL ON TABLE storage.buckets TO authenticated;
GRANT ALL ON TABLE storage.buckets TO anon;
GRANT ALL ON TABLE storage.buckets TO postgres WITH GRANT OPTION;


--
-- TOC entry 5061 (class 0 OID 0)
-- Dependencies: 335
-- Name: TABLE buckets_analytics; Type: ACL; Schema: storage; Owner: supabase_storage_admin
--

GRANT ALL ON TABLE storage.buckets_analytics TO service_role;
GRANT ALL ON TABLE storage.buckets_analytics TO authenticated;
GRANT ALL ON TABLE storage.buckets_analytics TO anon;


--
-- TOC entry 5062 (class 0 OID 0)
-- Dependencies: 336
-- Name: TABLE buckets_vectors; Type: ACL; Schema: storage; Owner: supabase_storage_admin
--

GRANT SELECT ON TABLE storage.buckets_vectors TO service_role;
GRANT SELECT ON TABLE storage.buckets_vectors TO authenticated;
GRANT SELECT ON TABLE storage.buckets_vectors TO anon;


--
-- TOC entry 5064 (class 0 OID 0)
-- Dependencies: 332
-- Name: TABLE objects; Type: ACL; Schema: storage; Owner: supabase_storage_admin
--

REVOKE ALL ON TABLE storage.objects FROM supabase_storage_admin;
GRANT ALL ON TABLE storage.objects TO supabase_storage_admin WITH GRANT OPTION;
GRANT ALL ON TABLE storage.objects TO service_role;
GRANT ALL ON TABLE storage.objects TO authenticated;
GRANT ALL ON TABLE storage.objects TO anon;
GRANT ALL ON TABLE storage.objects TO postgres WITH GRANT OPTION;


--
-- TOC entry 5065 (class 0 OID 0)
-- Dependencies: 333
-- Name: TABLE s3_multipart_uploads; Type: ACL; Schema: storage; Owner: supabase_storage_admin
--

GRANT ALL ON TABLE storage.s3_multipart_uploads TO service_role;
GRANT SELECT ON TABLE storage.s3_multipart_uploads TO authenticated;
GRANT SELECT ON TABLE storage.s3_multipart_uploads TO anon;


--
-- TOC entry 5066 (class 0 OID 0)
-- Dependencies: 334
-- Name: TABLE s3_multipart_uploads_parts; Type: ACL; Schema: storage; Owner: supabase_storage_admin
--

GRANT ALL ON TABLE storage.s3_multipart_uploads_parts TO service_role;
GRANT SELECT ON TABLE storage.s3_multipart_uploads_parts TO authenticated;
GRANT SELECT ON TABLE storage.s3_multipart_uploads_parts TO anon;


--
-- TOC entry 5067 (class 0 OID 0)
-- Dependencies: 337
-- Name: TABLE vector_indexes; Type: ACL; Schema: storage; Owner: supabase_storage_admin
--

GRANT SELECT ON TABLE storage.vector_indexes TO service_role;
GRANT SELECT ON TABLE storage.vector_indexes TO authenticated;
GRANT SELECT ON TABLE storage.vector_indexes TO anon;


-- Completed on 2026-04-25 12:35:25

--
-- PostgreSQL database dump complete
--

\unrestrict 8A55CoHaXHGkYJvArBojIff26lhje8X2IrVVOqmy81j6o7KWiavWao3fdPLfIFq

