/*
	stageprop Borrower {
        public void borrowItem(ItemRecord item) {
            Loan loan = new Loan(Borrower, item);
            item.validateAvailability(Borrower);
            Database.save(loan);
            
            Librarian.askForNextItem();
        }
    }
    requires {
        int id();
    }
    
    role Librarian {
        public void askForNextItem() {
            Controller.showMenu();
            
            Command cmd = Controller.awaitNextCommand();
            switch (cmd.name) {
                case "borrow-another":
                    Borrower.borrowItem(cmd.arguments[0]);
                    break;
                case "finish-with-receipt":
                    ...
                case "finish-without-receipt":
                    ...
            }
        }
    }
*/