/**
 * MLP Reno & Design - Main JavaScript
 * Minimal JS for mobile menu and smooth scrolling
 */

(function() {
    'use strict';

    // ====================================
    // Mobile Menu Toggle
    // ====================================
    const navToggle = document.querySelector('.nav-toggle');
    const navRightMobile = document.querySelectorAll('.nav-right')[1]; // Get mobile menu (second .nav-right)
    const navLinks = document.querySelectorAll('.nav-link');

    if (navToggle && navRightMobile) {
        // Toggle mobile menu
        navToggle.addEventListener('click', function() {
            const isOpen = !navRightMobile.classList.contains('-translate-x-full');

            if (isOpen) {
                navRightMobile.classList.add('-translate-x-full');
                document.body.style.overflow = '';
            } else {
                navRightMobile.classList.remove('-translate-x-full');
                document.body.style.overflow = 'hidden';
            }
        });

        // Close menu when clicking on a link
        navLinks.forEach(function(link) {
            link.addEventListener('click', function() {
                navRightMobile.classList.add('-translate-x-full');
                document.body.style.overflow = '';
            });
        });

        // Close menu when clicking outside
        document.addEventListener('click', function(event) {
            const isClickInsideMenu = navRightMobile.contains(event.target);
            const isClickOnToggle = navToggle.contains(event.target);
            const isOpen = !navRightMobile.classList.contains('-translate-x-full');

            if (!isClickInsideMenu && !isClickOnToggle && isOpen) {
                navRightMobile.classList.add('-translate-x-full');
                document.body.style.overflow = '';
            }
        });

        // Close menu on escape key
        document.addEventListener('keydown', function(event) {
            const isOpen = !navRightMobile.classList.contains('-translate-x-full');

            if (event.key === 'Escape' && isOpen) {
                navRightMobile.classList.add('-translate-x-full');
                document.body.style.overflow = '';
            }
        });
    }

    // ====================================
    // Smooth Scroll to Sections
    // ====================================
    const smoothScrollLinks = document.querySelectorAll('a[href^="#"]');

    smoothScrollLinks.forEach(function(link) {
        link.addEventListener('click', function(e) {
            const href = this.getAttribute('href');

            // Skip if it's just "#" or empty
            if (!href || href === '#') {
                return;
            }

            const targetId = href.substring(1);
            const targetSection = document.getElementById(targetId);

            if (targetSection) {
                e.preventDefault();

                // Calculate offset for sticky header
                const header = document.querySelector('.header');
                const headerHeight = header ? header.offsetHeight : 0;
                const targetPosition = targetSection.offsetTop - headerHeight;

                window.scrollTo({
                    top: targetPosition,
                    behavior: 'smooth'
                });

                // Update URL without jumping
                if (history.pushState) {
                    history.pushState(null, null, href);
                }
            }
        });
    });

    // ====================================
    // Contact Form Handler (Formspree)
    // ====================================
    const contactForm = document.getElementById('contactForm');
    const formStatus = document.getElementById('formStatus');

    if (contactForm) {
        contactForm.addEventListener('submit', function(e) {
            e.preventDefault();

            // Get form values
            const name = document.getElementById('name').value.trim();
            const email = document.getElementById('email').value.trim();
            const phone = document.getElementById('phone').value.trim();
            const message = document.getElementById('message').value.trim();

            // Basic validation
            if (!name || !email || !phone || !message) {
                showFormStatus('Veuillez remplir tous les champs requis.', 'error');
                return;
            }

            // Email validation
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(email)) {
                showFormStatus('Veuillez entrer une adresse courriel valide.', 'error');
                return;
            }

            // Phone validation (basic - at least 10 digits)
            const phoneDigits = phone.replace(/\D/g, '');
            if (phoneDigits.length < 10) {
                showFormStatus('Veuillez entrer un numéro de téléphone valide.', 'error');
                return;
            }

            // Submit to Formspree
            const formData = new FormData(contactForm);

            fetch(contactForm.action, {
                method: 'POST',
                body: formData,
                headers: {
                    'Accept': 'application/json'
                }
            })
            .then(function(response) {
                if (response.ok) {
                    showFormStatus('Merci! Nous avons bien reçu votre demande. Notre équipe vous contactera sous peu.', 'success');
                    contactForm.reset();
                } else {
                    return response.json().then(function(data) {
                        if (data.errors) {
                            showFormStatus('Une erreur est survenue. Veuillez réessayer.', 'error');
                        } else {
                            showFormStatus('Une erreur est survenue. Veuillez réessayer.', 'error');
                        }
                    });
                }
            })
            .catch(function(error) {
                showFormStatus('Une erreur est survenue. Veuillez réessayer.', 'error');
            });
        });
    }

    function showFormStatus(message, type) {
        if (formStatus) {
            formStatus.textContent = message;
            formStatus.style.display = 'block';

            if (type === 'success') {
                formStatus.style.backgroundColor = '#d4edda';
                formStatus.style.color = '#155724';
                formStatus.style.border = '1px solid #c3e6cb';
            } else {
                formStatus.style.backgroundColor = '#f8d7da';
                formStatus.style.color = '#721c24';
                formStatus.style.border = '1px solid #f5c6cb';
            }

            // Hide message after 5 seconds
            setTimeout(function() {
                formStatus.style.display = 'none';
            }, 5000);
        }
    }

    // ====================================
    // Scroll Animations - Intersection Observer
    // ====================================
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };

    const observer = new IntersectionObserver(function(entries) {
        entries.forEach(function(entry) {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                // Optional: Stop observing after animation
                // observer.unobserve(entry.target);
            }
        });
    }, observerOptions);

    // Observe all animated elements
    const animatedElements = document.querySelectorAll('.fade-in, .slide-in-left, .slide-in-right, .scale-up, .stagger-children');
    animatedElements.forEach(function(element) {
        observer.observe(element);
    });

    // ====================================
    // Cookie Consent Management
    // ====================================
    const cookieBanner = document.getElementById('cookieConsent');
    const cookieAcceptBtn = document.getElementById('cookieAccept');
    const cookieDeclineBtn = document.getElementById('cookieDecline');

    // Check if user has already made a choice
    const cookieConsent = localStorage.getItem('cookieConsent');

    if (!cookieConsent) {
        // Show banner after a short delay for better UX
        setTimeout(function() {
            cookieBanner.classList.add('show');
        }, 1000);
    }

    // Handle Accept button
    if (cookieAcceptBtn) {
        cookieAcceptBtn.addEventListener('click', function() {
            localStorage.setItem('cookieConsent', 'accepted');
            cookieBanner.classList.remove('show');

            // Initialize tracking scripts
            initializeTracking();
        });
    }

    // Handle Decline button
    if (cookieDeclineBtn) {
        cookieDeclineBtn.addEventListener('click', function() {
            localStorage.setItem('cookieConsent', 'declined');
            cookieBanner.classList.remove('show');
        });
    }

    // Initialize tracking scripts if consent was given
    function initializeTracking() {
        // Initialize Google Analytics
        if (typeof gtag !== 'undefined') {
            gtag('js', new Date());
            gtag('config', 'G-XXXXXXXXXX');
        }

        // Initialize Meta Pixel
        if (typeof fbq !== 'undefined') {
            fbq('init', 'YOUR_PIXEL_ID_HERE');
            fbq('track', 'PageView');
        }

        // Track form submissions
        if (contactForm) {
            contactForm.addEventListener('submit', function() {
                // Track with Google Analytics
                if (typeof gtag !== 'undefined') {
                    gtag('event', 'form_submit', {
                        'event_category': 'Contact',
                        'event_label': 'Contact Form'
                    });
                }

                // Track with Meta Pixel
                if (typeof fbq !== 'undefined') {
                    fbq('track', 'Contact');
                }
            });
        }
    }

    // If user already accepted, initialize tracking
    if (cookieConsent === 'accepted') {
        initializeTracking();
    }

    // ====================================
    // Initialize on DOM Load
    // ====================================
    console.log('MLP Reno & Design - Site ready');
})();
