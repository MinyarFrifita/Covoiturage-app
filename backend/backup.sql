--
-- PostgreSQL database dump
--

-- Dumped from database version 16.9 (Ubuntu 16.9-0ubuntu0.24.04.1)
-- Dumped by pg_dump version 16.9 (Ubuntu 16.9-0ubuntu0.24.04.1)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
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
-- Name: bookings; Type: TABLE; Schema: public; Owner: superuser
--

CREATE TABLE public.bookings (
    id integer NOT NULL,
    trip_id integer NOT NULL,
    passenger_id integer NOT NULL,
    seats_booked integer DEFAULT 1 NOT NULL,
    created_at timestamp without time zone DEFAULT (now() AT TIME ZONE 'utc'::text) NOT NULL,
    status character varying(20) DEFAULT 'confirmed'::character varying NOT NULL,
    CONSTRAINT check_booking_status CHECK (((status)::text = ANY ((ARRAY['confirmed'::character varying, 'cancelled'::character varying, 'completed'::character varying])::text[]))),
    CONSTRAINT check_seats_booked_positive CHECK ((seats_booked > 0))
);


ALTER TABLE public.bookings OWNER TO superuser;

--
-- Name: bookings_id_seq; Type: SEQUENCE; Schema: public; Owner: superuser
--

CREATE SEQUENCE public.bookings_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.bookings_id_seq OWNER TO superuser;

--
-- Name: bookings_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: superuser
--

ALTER SEQUENCE public.bookings_id_seq OWNED BY public.bookings.id;


--
-- Name: feedbacks; Type: TABLE; Schema: public; Owner: superuser
--

CREATE TABLE public.feedbacks (
    id integer NOT NULL,
    user_id integer NOT NULL,
    trip_id integer NOT NULL,
    rating integer NOT NULL,
    comment character varying(500),
    created_at timestamp without time zone DEFAULT (now() AT TIME ZONE 'utc'::text) NOT NULL,
    booking_id integer,
    CONSTRAINT check_rating_range CHECK (((rating >= 1) AND (rating <= 5)))
);


ALTER TABLE public.feedbacks OWNER TO superuser;

--
-- Name: feedbacks_id_seq; Type: SEQUENCE; Schema: public; Owner: superuser
--

CREATE SEQUENCE public.feedbacks_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.feedbacks_id_seq OWNER TO superuser;

--
-- Name: feedbacks_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: superuser
--

ALTER SEQUENCE public.feedbacks_id_seq OWNED BY public.feedbacks.id;


--
-- Name: notifications; Type: TABLE; Schema: public; Owner: superuser
--

CREATE TABLE public.notifications (
    id integer NOT NULL,
    passenger_id integer NOT NULL,
    driver_id integer NOT NULL,
    trip_id integer,
    message text NOT NULL,
    created_at timestamp without time zone DEFAULT (now() AT TIME ZONE 'utc'::text) NOT NULL,
    email_status character varying(20) DEFAULT 'pending'::character varying,
    is_read boolean DEFAULT false NOT NULL
);


ALTER TABLE public.notifications OWNER TO superuser;

--
-- Name: notifications_id_seq; Type: SEQUENCE; Schema: public; Owner: superuser
--

CREATE SEQUENCE public.notifications_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.notifications_id_seq OWNER TO superuser;

--
-- Name: notifications_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: superuser
--

ALTER SEQUENCE public.notifications_id_seq OWNED BY public.notifications.id;


--
-- Name: temp_trips; Type: TABLE; Schema: public; Owner: superuser
--

CREATE TABLE public.temp_trips (
    id integer,
    photo_data bytea
);


ALTER TABLE public.temp_trips OWNER TO superuser;

--
-- Name: trip_requests; Type: TABLE; Schema: public; Owner: superuser
--

CREATE TABLE public.trip_requests (
    id integer NOT NULL,
    passenger_id integer NOT NULL,
    departure_city character varying(100) NOT NULL,
    destination character varying(100) NOT NULL,
    date_time timestamp without time zone NOT NULL,
    sexe character varying(20),
    created_at timestamp without time zone DEFAULT (now() AT TIME ZONE 'utc'::text) NOT NULL,
    trip_id integer,
    status character varying(20) DEFAULT 'pending'::character varying NOT NULL,
    CONSTRAINT check_request_status CHECK (((status)::text = ANY ((ARRAY['pending'::character varying, 'accepted'::character varying, 'rejected'::character varying])::text[])))
);


ALTER TABLE public.trip_requests OWNER TO superuser;

--
-- Name: trip_requests_id_seq; Type: SEQUENCE; Schema: public; Owner: superuser
--

CREATE SEQUENCE public.trip_requests_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.trip_requests_id_seq OWNER TO superuser;

--
-- Name: trip_requests_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: superuser
--

ALTER SEQUENCE public.trip_requests_id_seq OWNED BY public.trip_requests.id;


--
-- Name: trips; Type: TABLE; Schema: public; Owner: superuser
--

CREATE TABLE public.trips (
    id integer NOT NULL,
    driver_id integer NOT NULL,
    departure_city character varying(100) NOT NULL,
    destination character varying(100) NOT NULL,
    date_time timestamp without time zone NOT NULL,
    available_seats integer NOT NULL,
    price double precision NOT NULL,
    created_at timestamp without time zone DEFAULT (now() AT TIME ZONE 'utc'::text) NOT NULL,
    photo_path character varying(255),
    car_type character varying(50),
    description character varying(500),
    return_date timestamp without time zone,
    status character varying(50) DEFAULT 'active'::character varying,
    sexe text,
    custom_notification_message character varying(500)
);


ALTER TABLE public.trips OWNER TO superuser;

--
-- Name: trips_id_seq; Type: SEQUENCE; Schema: public; Owner: superuser
--

CREATE SEQUENCE public.trips_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.trips_id_seq OWNER TO superuser;

--
-- Name: trips_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: superuser
--

ALTER SEQUENCE public.trips_id_seq OWNED BY public.trips.id;


--
-- Name: users; Type: TABLE; Schema: public; Owner: superuser
--

CREATE TABLE public.users (
    id integer NOT NULL,
    email character varying(255) NOT NULL,
    password character varying(255) NOT NULL,
    role character varying(50) DEFAULT 'passenger'::character varying,
    sexe character varying(20),
    created_at timestamp without time zone DEFAULT (now() AT TIME ZONE 'utc'::text) NOT NULL,
    photo_path character varying
);


ALTER TABLE public.users OWNER TO superuser;

--
-- Name: users_id_seq; Type: SEQUENCE; Schema: public; Owner: superuser
--

CREATE SEQUENCE public.users_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.users_id_seq OWNER TO superuser;

--
-- Name: users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: superuser
--

ALTER SEQUENCE public.users_id_seq OWNED BY public.users.id;


--
-- Name: bookings id; Type: DEFAULT; Schema: public; Owner: superuser
--

ALTER TABLE ONLY public.bookings ALTER COLUMN id SET DEFAULT nextval('public.bookings_id_seq'::regclass);


--
-- Name: feedbacks id; Type: DEFAULT; Schema: public; Owner: superuser
--

ALTER TABLE ONLY public.feedbacks ALTER COLUMN id SET DEFAULT nextval('public.feedbacks_id_seq'::regclass);


--
-- Name: notifications id; Type: DEFAULT; Schema: public; Owner: superuser
--

ALTER TABLE ONLY public.notifications ALTER COLUMN id SET DEFAULT nextval('public.notifications_id_seq'::regclass);


--
-- Name: trip_requests id; Type: DEFAULT; Schema: public; Owner: superuser
--

ALTER TABLE ONLY public.trip_requests ALTER COLUMN id SET DEFAULT nextval('public.trip_requests_id_seq'::regclass);


--
-- Name: trips id; Type: DEFAULT; Schema: public; Owner: superuser
--

ALTER TABLE ONLY public.trips ALTER COLUMN id SET DEFAULT nextval('public.trips_id_seq'::regclass);


--
-- Name: users id; Type: DEFAULT; Schema: public; Owner: superuser
--

ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);


--
-- Data for Name: bookings; Type: TABLE DATA; Schema: public; Owner: superuser
--

COPY public.bookings (id, trip_id, passenger_id, seats_booked, created_at, status) FROM stdin;
39	27	17	1	2025-07-16 09:58:13.155674	confirmed
\.


--
-- Data for Name: feedbacks; Type: TABLE DATA; Schema: public; Owner: superuser
--

COPY public.feedbacks (id, user_id, trip_id, rating, comment, created_at, booking_id) FROM stdin;
\.


--
-- Data for Name: notifications; Type: TABLE DATA; Schema: public; Owner: superuser
--

COPY public.notifications (id, passenger_id, driver_id, trip_id, message, created_at, email_status, is_read) FROM stdin;
72	17	16	27	Booking confirmed for trip 27	2025-07-16 09:58:13.446054	failed	f
\.


--
-- Data for Name: temp_trips; Type: TABLE DATA; Schema: public; Owner: superuser
--

COPY public.temp_trips (id, photo_data) FROM stdin;
21	\\x75706c6f6164732f6472697665722e706e67
14	\\x75706c6f6164732f6472697665722e706e67
18	\\x75706c6f6164732f313735313937353939335f6472697665722e706e67
19	\\x75706c6f6164732f313735313938373533365f6472697665722e706e67
17	\\x75706c6f6164732f313735313937353931395f6472697665722e706e67
13	\\x75706c6f6164732f6472697665722e706e67
20	\\x75706c6f6164732f313735313938373636365f6472697665722e706e67
24	\\x75706c6f6164732f313735323136383737385f6472697665722e706e67
15	\\x75706c6f6164732f6472697665722e706e67
12	\\x75706c6f6164732f6472697665722e706e67
16	\\x75706c6f6164732f313735313936393438315f6472697665722e706e67
\.


--
-- Data for Name: trip_requests; Type: TABLE DATA; Schema: public; Owner: superuser
--

COPY public.trip_requests (id, passenger_id, departure_city, destination, date_time, sexe, created_at, trip_id, status) FROM stdin;
\.


--
-- Data for Name: trips; Type: TABLE DATA; Schema: public; Owner: superuser
--

COPY public.trips (id, driver_id, departure_city, destination, date_time, available_seats, price, created_at, photo_path, car_type, description, return_date, status, sexe, custom_notification_message) FROM stdin;
27	16	Tunis 	Bengo	2025-07-24 10:00:00	2	50	2025-07-14 20:55:39.944131	\N	kia 	no smoking	2025-09-24 10:00:00	planned		\N
29	16	Tunis	Djerba	2025-10-10 10:00:00	2	50	2025-07-17 16:54:02.693152	\\x74726970732f313735323737313234325f6472697665722e706e67	volvo	...	\N	planned	\N	\N
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: superuser
--

COPY public.users (id, email, password, role, sexe, created_at, photo_path) FROM stdin;
3	admin@gmail.com	$2b$12$CcUFjv6suXHJO98gY69fve4.AW/TUXKZccsu5rrpyYiHKAT0LqdHq	admin	Homme	2025-07-05 15:47:39.808102	/static/images/admin.jpg
20	passenger2@gmail.com	$2b$12$LId4iLNi6DL88IQucMMCSOGvvBP7c6FVBYU5RqdOy544yBsmeKj7O	passenger	male	2025-07-17 18:53:18.341814	users/profile_passenger2_gmail_com.png
16	driver1@gmail.com	$2b$12$5GhXLPLTf6L65fxLK6AyT.o9okTfiAPDYbtllxK/hZ/qWJxBFHq0W	driver	female	2025-07-14 18:03:05.561406	users/driver.png
18	driver2@gmail.com	$2b$12$ZUlkEcc.em9NUu5dOpzpYeCw9IKK1eDFB2SLjejbuEdiZU1uGeaR6	driver	male	2025-07-16 10:00:54.153735	users/profile_driver2_gmail_com.png
19	driver3@gmail.com	$2b$12$XLrwoSAUhn2R7xAP08/dPu5ijcPHG4yEdA/HRfJrVfiPOcUR9UILK	driver	female	2025-07-16 10:21:36.421391	users/profile_driver3_gmail_com.png
17	passenger1@gmail.com	$2b$12$kX7EiqcTRWJWnNcyNGurtuFMBhsh8RafsotWLnEBqZH5noieT/oSC	passenger	female	2025-07-14 21:10:59.997583	\N
\.


--
-- Name: bookings_id_seq; Type: SEQUENCE SET; Schema: public; Owner: superuser
--

SELECT pg_catalog.setval('public.bookings_id_seq', 40, true);


--
-- Name: feedbacks_id_seq; Type: SEQUENCE SET; Schema: public; Owner: superuser
--

SELECT pg_catalog.setval('public.feedbacks_id_seq', 11, true);


--
-- Name: notifications_id_seq; Type: SEQUENCE SET; Schema: public; Owner: superuser
--

SELECT pg_catalog.setval('public.notifications_id_seq', 73, true);


--
-- Name: trip_requests_id_seq; Type: SEQUENCE SET; Schema: public; Owner: superuser
--

SELECT pg_catalog.setval('public.trip_requests_id_seq', 16, true);


--
-- Name: trips_id_seq; Type: SEQUENCE SET; Schema: public; Owner: superuser
--

SELECT pg_catalog.setval('public.trips_id_seq', 29, true);


--
-- Name: users_id_seq; Type: SEQUENCE SET; Schema: public; Owner: superuser
--

SELECT pg_catalog.setval('public.users_id_seq', 21, true);


--
-- Name: bookings bookings_pkey; Type: CONSTRAINT; Schema: public; Owner: superuser
--

ALTER TABLE ONLY public.bookings
    ADD CONSTRAINT bookings_pkey PRIMARY KEY (id);


--
-- Name: feedbacks feedbacks_pkey; Type: CONSTRAINT; Schema: public; Owner: superuser
--

ALTER TABLE ONLY public.feedbacks
    ADD CONSTRAINT feedbacks_pkey PRIMARY KEY (id);


--
-- Name: notifications notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: superuser
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_pkey PRIMARY KEY (id);


--
-- Name: trip_requests trip_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: superuser
--

ALTER TABLE ONLY public.trip_requests
    ADD CONSTRAINT trip_requests_pkey PRIMARY KEY (id);


--
-- Name: trips trips_pkey; Type: CONSTRAINT; Schema: public; Owner: superuser
--

ALTER TABLE ONLY public.trips
    ADD CONSTRAINT trips_pkey PRIMARY KEY (id);


--
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: superuser
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: superuser
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: bookings bookings_passenger_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: superuser
--

ALTER TABLE ONLY public.bookings
    ADD CONSTRAINT bookings_passenger_id_fkey FOREIGN KEY (passenger_id) REFERENCES public.users(id);


--
-- Name: bookings bookings_trip_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: superuser
--

ALTER TABLE ONLY public.bookings
    ADD CONSTRAINT bookings_trip_id_fkey FOREIGN KEY (trip_id) REFERENCES public.trips(id);


--
-- Name: feedbacks feedbacks_trip_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: superuser
--

ALTER TABLE ONLY public.feedbacks
    ADD CONSTRAINT feedbacks_trip_id_fkey FOREIGN KEY (trip_id) REFERENCES public.trips(id);


--
-- Name: feedbacks feedbacks_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: superuser
--

ALTER TABLE ONLY public.feedbacks
    ADD CONSTRAINT feedbacks_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: feedbacks fk_booking; Type: FK CONSTRAINT; Schema: public; Owner: superuser
--

ALTER TABLE ONLY public.feedbacks
    ADD CONSTRAINT fk_booking FOREIGN KEY (booking_id) REFERENCES public.bookings(id);


--
-- Name: notifications notifications_driver_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: superuser
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_driver_id_fkey FOREIGN KEY (driver_id) REFERENCES public.users(id);


--
-- Name: notifications notifications_passenger_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: superuser
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_passenger_id_fkey FOREIGN KEY (passenger_id) REFERENCES public.users(id);


--
-- Name: notifications notifications_trip_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: superuser
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_trip_id_fkey FOREIGN KEY (trip_id) REFERENCES public.trips(id);


--
-- Name: trip_requests trip_requests_passenger_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: superuser
--

ALTER TABLE ONLY public.trip_requests
    ADD CONSTRAINT trip_requests_passenger_id_fkey FOREIGN KEY (passenger_id) REFERENCES public.users(id);


--
-- Name: trip_requests trip_requests_trip_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: superuser
--

ALTER TABLE ONLY public.trip_requests
    ADD CONSTRAINT trip_requests_trip_id_fkey FOREIGN KEY (trip_id) REFERENCES public.trips(id);


--
-- Name: trips trips_driver_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: superuser
--

ALTER TABLE ONLY public.trips
    ADD CONSTRAINT trips_driver_id_fkey FOREIGN KEY (driver_id) REFERENCES public.users(id);


--
-- Name: SCHEMA public; Type: ACL; Schema: -; Owner: pg_database_owner
--

GRANT ALL ON SCHEMA public TO superuser;


--
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: public; Owner: postgres
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES TO superuser;


--
-- PostgreSQL database dump complete
--

